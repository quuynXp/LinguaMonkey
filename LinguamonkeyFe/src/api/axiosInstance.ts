import { EXPO_PUBLIC_API_BASE_URL } from '@env';
import axios, { AxiosRequestConfig } from 'axios';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useTokenStore, setTokens, clearTokens } from '../stores/tokenStore';
import { showError } from '../utils/toastHelper';
import * as Localization from 'expo-localization';
import { getErrorMessageFromCode } from '../types/errorCodes';
import { t } from 'i18next';
import { RootNavigationRef } from '../utils/navigationRef';
import * as Application from 'expo-application';
import { resetToAuth } from '../utils/navigationRef';
import { useUserStore } from '../stores/UserStore';
import AsyncStorage from '@react-native-async-storage/async-storage';


const userLocale = Localization.getLocales()[0]?.languageTag || 'en-US';

const instance = axios.create({
  baseURL: EXPO_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// ===== REQUEST INTERCEPTOR =====
instance.interceptors.request.use(async (config: AxiosRequestConfig) => {
  const tokenStore = useTokenStore.getState();
  const accessToken = tokenStore.accessToken;

  // Device ID chuẩn
  let deviceId = 'unknown-device';
  if (Platform.OS === 'android') {
    deviceId = Application.androidId || 'unknown-device';
  } else if (Platform.OS === 'ios') {
    deviceId = await Application.getIosIdForVendorAsync();
  }

  // Chỉ set những header thực sự có giá trị
  const headers: Record<string, string> = {
    'Accept-Language': userLocale,
    'Device-Id': deviceId,
    'X-Forwarded-For': 'unknown-ip',
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (Platform.OS !== 'web') headers['User-Agent'] = `${Device.osName} ${Device.osVersion}`;

  config.headers = {
    ...config.headers,
    ...headers,
  };

  return config;
}, (error) => Promise.reject(error));


// ===== RESPONSE INTERCEPTOR =====
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { refreshToken, setTokens, clearTokens, initialized } = useTokenStore.getState();
    const hasLoggedIn = (await AsyncStorage.getItem('hasLoggedIn')) === 'true';

    const status = error.response?.status;
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || 'Unknown error';

    // Skip retry if store is not initialized
    if (!initialized) {
      console.log('Token store not initialized, skipping retry');
      return Promise.reject(error);
    }

    const shouldRetry =
      status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh-token';

    if (shouldRetry && refreshToken) {
      originalRequest._retry = true;
      try {
        const res = await axios.post('/auth/refresh-token', { refreshToken });
        const newAccessToken = res.data.result?.token;
        const newRefreshToken = res.data.result?.refreshToken;

        if (newAccessToken && newRefreshToken) {
          await setTokens(newAccessToken, newRefreshToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } else {
          throw new Error('Invalid refresh token response');
        }
      } catch (refreshError) {
        console.error('Refresh token error:', refreshError);
        if (hasLoggedIn) {
          resetToAuth('Login');
        }
        return Promise.reject(refreshError);
      }
    }

    const sensitiveErrorCodes = ['TOKEN_INVALID', 'REFRESH_TOKEN_EXPIRED'];
    if (sensitiveErrorCodes.includes(errorCode) || status === 401) {
      if (hasLoggedIn && initialized) {
        resetToAuth('Login');
      }
      return Promise.reject(error);
    }

    const friendlyMessage = errorCode
      ? getErrorMessageFromCode(errorCode, errorMessage)
      : errorMessage;

    showError(
      t(
        errorCode && errorCode < 5000 ? 'apiError' : friendlyMessage,
        { code: errorCode, message: friendlyMessage }
      )
    );

    return Promise.reject(error);
  }
);

export default instance;

// ===== Hỗ trợ move Cloudinary =====
export async function moveCloudinaryFromTemp(userId: number | string, fromPublicId: string) {
  const leaf = fromPublicId.replace(/^temp\//, '');
  const toPublicId = `avatars/${userId}/${leaf}`;

  return instance.post('/api/media/move', {
    fromPublicId,
    toPublicId,
    overwrite: true,
    resourceType: 'image',
  });
}
