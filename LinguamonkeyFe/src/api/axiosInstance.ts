import { EXPO_PUBLIC_API_BASE_URL } from '@env';
import axios from 'axios';
import { useTokenStore } from './../stores/tokenStore';
import { createNavigationContainerRef } from '@react-navigation/native';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import { getErrorMessageFromCode } from '../types/errorCodes';

export const RootNavigation = createNavigationContainerRef();

// Lấy locale user
const userLocale = Localization.getLocales()[0]?.languageTag || 'en-US';

const instance = axios.create({
  baseURL: EXPO_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// ====== REQUEST INTERCEPTOR ======
instance.interceptors.request.use(
  (config) => {
      console.log("API Request:", config.baseURL + config.url, config.headers);
    config.headers = config.headers || {};
    config.headers['Accept-Language'] = userLocale;

    const { accessToken } = useTokenStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const deviceId = Device.osInternalBuildId || Device.deviceId || 'unknown-device';
    const ip = 'unknown-ip';

    config.headers['Device-Id'] = deviceId;
    config.headers['X-Forwarded-For'] = ip;

    if (Platform.OS !== 'web') {
      const userAgent = Device.osName + ' ' + Device.osVersion;
      config.headers['User-Agent'] = userAgent;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ====== RESPONSE INTERCEPTOR ======
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const tokenStore = useTokenStore.getState();

    // Chỉ xử lý khi 401 & chưa retry & không phải call refresh-token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh-token'
    ) {
      originalRequest._retry = true;

      const { refreshToken, setTokens, clearTokens } = tokenStore;

      try {
        let res;

        if (Platform.OS === 'web') {
          // ===== Web → rely on cookie =====
          res = await instance.post(
            '/auth/refresh-token',
            {}, // body trống
            {
              headers: {
                'Accept-Language': originalRequest.headers['Accept-Language'],
                'Device-Id': originalRequest.headers['Device-Id'],
                'X-Forwarded-For': originalRequest.headers['X-Forwarded-For'],
                'User-Agent': originalRequest.headers['User-Agent'] || 'unknown-user-agent',
              },
              withCredentials: true, // bắt buộc để gửi cookie
            }
          );
        } else {
          // ===== Mobile → gửi refreshToken trong body =====
          if (!refreshToken) {
            await clearTokens();
            RootNavigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            return Promise.reject(error);
          }

          res = await instance.post(
            '/auth/refresh-token',
            { refreshToken },
            {
              headers: {
                'Accept-Language': originalRequest.headers['Accept-Language'],
                'Device-Id': originalRequest.headers['Device-Id'],
                'X-Forwarded-For': originalRequest.headers['X-Forwarded-For'],
                'User-Agent': originalRequest.headers['User-Agent'] || 'unknown-user-agent',
              },
            }
          );
        }

        const newAccessToken = res.data.result.token;
        const newRefreshToken = res.data.result.refreshToken;

        if (newAccessToken && newRefreshToken) {
          await setTokens(newAccessToken, newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return instance(originalRequest);
        } else {
          throw new Error('Invalid refresh token response');
        }
      } catch (refreshError) {
        await clearTokens();
        RootNavigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return Promise.reject(refreshError);
      }
    }

    // ====== Xử lý lỗi bình thường ======
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || 'Unknown error';

    if (errorCode) {
      const friendlyMessage = getErrorMessageFromCode(errorCode, errorMessage);

      if (errorCode >= 5000) {
        alert('System error, please try again later.');
      } else {
        alert(friendlyMessage);
      }

      return Promise.reject({ code: errorCode, message: friendlyMessage });
    }

    alert(errorMessage);
    return Promise.reject(error);
  }
);

export default instance;

export async function moveCloudinaryFromTemp(userId: number | string, fromPublicId: string) {
  const leaf = fromPublicId.replace(/^temp\//, ''); // "abc123"
  const toPublicId = `avatars/${userId}/${leaf}`;

  // ví dụ: POST /api/media/move
  return instance.post('/api/media/move', {
    fromPublicId,
    toPublicId,
    overwrite: true,
    resourceType: 'image', // avatar là ảnh
  });
}