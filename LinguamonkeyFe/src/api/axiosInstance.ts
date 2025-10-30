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
import { introspectToken } from '../services/authService';
import { refreshTokenApi } from '../services/authService';
import {EXPO_PUBLIC_API_BASE_URL} from "react-native-dotenv"

const API_BASE_URL = EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;
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
    originalRequest._retryCount = originalRequest._retryCount ?? 0;

    if (status === 401 && !isRefreshEndpoint) {
      if (originalRequest._retryCount >= 1) {
        await clearTokens();
        if (hasLoggedIn) resetToAuth('Login');
        return Promise.reject(error);
      }
      originalRequest._retryCount += 1;

      const latestAccess = useTokenStore.getState().accessToken;
      const latestRefresh = useTokenStore.getState().refreshToken;

      if (latestAccess) {
        try {
          const valid = await introspectToken(latestAccess);
          if (valid) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${latestAccess}`;
            return instance(originalRequest);
          }
        } catch (ie) {
          console.error('[introspectToken error]', ie);
        }
      }

      if (!latestRefresh) {
        await clearTokens();
        if (hasLoggedIn) resetToAuth('Login');
        return Promise.reject(error);
      }

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const result = await refreshTokenApi(latestRefresh);
              if (!result?.token || !result?.refreshToken) throw new Error('Invalid refresh result');
              await setTokens(result.token, result.refreshToken);
              return result.token;
            } catch (e) {
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
        await clearTokens();
        if (hasLoggedIn) resetToAuth('Login');
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && isRefreshEndpoint) {
      await clearTokens();
      if (hasLoggedIn) resetToAuth('Login');
      return Promise.reject(error);
    }

    const sensitiveErrorCodes = ['TOKEN_INVALID', 'REFRESH_TOKEN_EXPIRED'];
    if (sensitiveErrorCodes.includes(errorCode)) {
      await clearTokens();
      if (hasLoggedIn) resetToAuth('Login');
      return Promise.reject(error);
    }

    const backendMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unknown error';
    showError(backendMessage);

    return Promise.reject(error);
  }
);


export default instance;
