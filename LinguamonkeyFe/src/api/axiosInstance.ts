import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useTokenStore } from '../stores/tokenStore';
import { showError } from '../utils/toastHelper';
import * as Localization from 'expo-localization';
import { getErrorMessageFromCode } from '../types/errorCodes';
import { t } from 'i18next';
import * as Application from 'expo-application';
import { resetToAuth } from '../utils/navigationRef';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
let isClearingTokens = false;

function waitForTokenStoreInit(timeout = 5000) {
  return new Promise<void>((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (useTokenStore.getState().initialized) return resolve();
      if (Date.now() - start > timeout) return resolve();
      setTimeout(tick, 50);
    };
    tick();
  });
}

export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const userLocale = Localization.getLocales()[0]?.languageTag || 'en-US';

const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

instance.interceptors.request.use(cfg => {
  console.log('[instance] request ->', cfg.method, cfg.url, 'dataType=', typeof cfg.data);
  return cfg;
});

instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await waitForTokenStoreInit(5000);

  if (config.url?.toLowerCase().includes('/auth/refresh-token')) {
    const rawData = config.data;
    let dataObj: any = rawData;

    if (typeof rawData === 'string') {
      try { dataObj = JSON.parse(rawData); } catch {
        try {
          dataObj = Object.fromEntries(new URLSearchParams(rawData).entries());
        } catch {
          dataObj = rawData;
        }
      }
    }

    const bodyHasRefresh =
      dataObj &&
      typeof dataObj === 'object' &&
      'refreshToken' in dataObj &&
      typeof dataObj.refreshToken === 'string' &&
      dataObj.refreshToken.trim().length > 0;

    console.log('[instance.request] /auth/refresh-token request detected', {
      url: config.url,
      bodyPresent: !!dataObj,
      bodyHasRefresh,
      callerStack: new Error().stack?.split('\n').slice(2, 7)
    });

    if (!bodyHasRefresh) {
      console.warn('[instance.request] Missing refreshToken in body. Allowing request to proceed — server may accept other formats.');
    }
  }

  const accessToken = useTokenStore.getState().accessToken;

  let deviceId = 'unknown-device';
  try {
    if (Platform.OS === 'android') {
      deviceId = await Application.getAndroidId();
    } else if (Platform.OS === 'ios') {
      deviceId = await Application.getIosIdForVendorAsync();
    }
  } catch (e) {
    console.warn('device id read error', e);
  }

  config.headers['Accept-Language'] = userLocale;
  config.headers['Device-Id'] = deviceId;
  config.headers['X-Forwarded-For'] = 'unknown-ip';

  if (accessToken && accessToken.trim().length > 0) {
    config.headers['Authorization'] = `Bearer ${accessToken.trim()}`;
  }

  return config;
});


let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const { setTokens, clearTokens, initialized } = useTokenStore.getState();
    const hasLoggedIn = (await AsyncStorage.getItem('hasLoggedIn')) === 'true';

    const status = error.response?.status;
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || 'Unknown error';

    console.log('[axios response] error details', { status, errorCode, errorMessage, url: originalRequest.url });

    if (!initialized) {
      console.log('Token store not initialized, skipping retry/reset. url=', originalRequest.url);
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';
    const isRefreshEndpoint = requestUrl.includes('/auth/refresh-token');

    // ensure not infinite retry
    originalRequest._retryCount = originalRequest._retryCount ?? 0;

    if (status === 401 && !isRefreshEndpoint) {
      if (originalRequest._retryCount >= 1) {
        console.log('[axios response] already retried once, aborting and clearing tokens');
        await clearTokens();
        if (hasLoggedIn) resetToAuth('Login');
        return Promise.reject(error);
      }
      originalRequest._retryCount += 1;

      // READ LATEST tokens trực tiếp từ store (no stale)
      const latestAccess = useTokenStore.getState().accessToken;
      const latestRefresh = useTokenStore.getState().refreshToken;

      // If there's an access token, introspect it **now**
      if (latestAccess) {
        try {
          const { introspectToken } = await import('../services/authService');
          const tokenStillValid = await introspectToken(latestAccess);
          console.log('[axios response] introspectToken result:', tokenStillValid);

          if (tokenStillValid === true) {
            // token vẫn valid -> retry request with latest access
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${latestAccess}`;
            return instance(originalRequest);
          }
        } catch (ie) {
          console.error('[axios response] introspectToken error:', ie);
          // tiếp tục flow -> sẽ thử refresh nếu có refresh token
        }
      }

      // Nếu không có refresh token vào thời điểm này -> không gọi refresh
      if (!latestRefresh || latestRefresh.trim().length === 0) {
        console.log('[axios response] No refresh token present at refresh time -> clearing tokens');
        await clearTokens();
        if (hasLoggedIn) resetToAuth('Login');
        return Promise.reject(error);
      }

      // Thực hiện refresh (single-flight)
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const { refreshTokenApi } = await import('../services/authService');
              const result = await refreshTokenApi(latestRefresh);
              if (!result?.token || !result?.refreshToken) {
                throw new Error('Invalid refresh result');
              }
              await setTokens(result.token, result.refreshToken);
              return result.token;
            } catch (e) {
              console.error('[Refresh] failure inside refreshPromise', e);
              await clearTokens();
              return null;
            } finally {
              isRefreshing = false;
              refreshPromise = null;
            }
          })();
        }

        const newAccessToken = await refreshPromise;
        if (!newAccessToken) {
          if (hasLoggedIn) resetToAuth('Login');
          return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token error:', refreshError);
        await clearTokens();
        if (hasLoggedIn) resetToAuth('Login');
        return Promise.reject(refreshError);
      }
    }

    // 401 returned from refresh endpoint itself -> clear tokens and stop
    if (status === 401 && isRefreshEndpoint) {
      console.log('401 on refresh endpoint -> clear tokens and stop');
      await clearTokens();
      if (hasLoggedIn) resetToAuth('Login');
      return Promise.reject(error);
    }

    // other sensitive errors...
    const sensitiveErrorCodes = ['TOKEN_INVALID', 'REFRESH_TOKEN_EXPIRED'];
    if (sensitiveErrorCodes.includes(errorCode)) {
      console.log('Sensitive auth error -> resetToAuth', { errorCode });
      await clearTokens();
      if (hasLoggedIn) resetToAuth('Login');
      return Promise.reject(error);
    }

    // fallback error handling
    if (status === 401) {
      console.log('401 after retry => clearTokens');
      if (!isClearingTokens) {
        isClearingTokens = true;
        try { await clearTokens(); } finally { isClearingTokens = false; }
      }
      return Promise.reject(error);
    }

    // show friendly error
    const friendlyMessage = errorCode ? getErrorMessageFromCode(errorCode, errorMessage) : errorMessage;
    showError(t(errorCode && errorCode < 5000 ? 'apiError' : friendlyMessage, { code: errorCode, message: friendlyMessage }));
    return Promise.reject(error);
  }
);

export default instance;
