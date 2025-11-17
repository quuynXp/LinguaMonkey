import axios, { InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useTokenStore } from '../stores/tokenStore';
import { showError } from '../utils/toastHelper';
import * as Localization from 'expo-localization';
import { refreshTokenApi } from '../services/authService';
import { resetToAuth } from '../utils/navigationRef';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { API_BASE_URL } from './apiConfig';

const userLocale = Localization.getLocales()[0]?.languageTag || 'en-US';
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;


export async function getDeviceIdSafe() {
  try {
    const deviceId =
      Device.osInternalBuildId ||
      Device.modelId ||
      Device.modelName ||
      Device.deviceName ||
      'unknown-device';
    return deviceId;
  } catch (err) {
    console.warn('[device id read error]', err);
    return 'unknown-device';
  }
}

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


const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

instance.interceptors.request.use(cfg => {
  console.log('[instance] request ->', cfg.method, cfg.url, 'dataType=', typeof cfg.data);
  return cfg;
});

instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { accessToken, initialized } = useTokenStore.getState();
  if (!initialized) return config;

  const deviceId = await getDeviceIdSafe();
  config.headers['Accept-Language'] = userLocale;
  config.headers['Device-Id'] = deviceId;
  config.headers['X-Forwarded-For'] = 'unknown-ip';

  if (accessToken) config.headers['Authorization'] = `Bearer ${accessToken}`;
  return config;
});

instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await waitForTokenStoreInit(5000);

  if (config.url?.toLowerCase().includes('/api/v1/auth/refresh-token')) {
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

    console.log('[instance.request] /api/v1/auth/refresh-token request detected', {
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
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      deviceId = Device.osInternalBuildId || Device.modelId || Device.modelName || 'unknown-device';
    } else {
      deviceId = Device.deviceName || 'unknown-device';
    }
  } catch (e) {
    console.warn('[device id read error]', e);
  }

  config.headers['Accept-Language'] = userLocale;
  config.headers['Device-Id'] = deviceId;
  config.headers['X-Forwarded-For'] = 'unknown-ip';

  if (accessToken && accessToken.trim().length > 0) {
    config.headers['Authorization'] = `Bearer ${accessToken.trim()}`;
  }

  return config;
});

instance.interceptors.response.use(
  res => res,
  async (error) => {
    const originalRequest = error.config || {};
    const { setTokens, clearTokens } = useTokenStore.getState();
    const hasLoggedIn = (await AsyncStorage.getItem('hasLoggedIn')) === 'true';

    const status = error.response?.status;
    if (status !== 401) {
      const backendMessage = error.response?.data?.message || error.message || 'Unknown error';
      showError(backendMessage);
      return Promise.reject(error);
    }

    const isRefreshEndpoint = originalRequest.url?.includes('/api/v1/auth/refresh-token');
    if (isRefreshEndpoint) {
      await clearTokens();
      if (hasLoggedIn) resetToAuth('Login');
      return Promise.reject(error);
    }

    if (originalRequest._retryCount >= 1) {
      await clearTokens();
      if (hasLoggedIn) resetToAuth('Login');
      return Promise.reject(error);
    }

    originalRequest._retryCount = 1;
    const latestRefresh = useTokenStore.getState().refreshToken;
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
            const deviceId = await getDeviceIdSafe();
            const result = await refreshTokenApi(latestRefresh, deviceId);

            if (!result?.token || !result?.refreshToken) throw new Error('Invalid refresh result');
            await setTokens(result.token, result.refreshToken);
            return result.token;
          } catch {
            return null;
          } finally {
            isRefreshing = false;
            refreshPromise = null;
          }
        })();
      }

      const newToken = await refreshPromise;
      if (!newToken) {
        if (hasLoggedIn) resetToAuth('Login');
        return Promise.reject(error);
      }

      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return instance(originalRequest);
    } catch (e) {
      await clearTokens();
      if (hasLoggedIn) resetToAuth('Login');
      return Promise.reject(e);
    }
  }
);

export default instance;
