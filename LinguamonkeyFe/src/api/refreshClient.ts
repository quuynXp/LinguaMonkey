import { EXPO_PUBLIC_API_BASE_URL } from '@env';
import axios, { AxiosRequestConfig } from 'axios';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';

export const refreshClient = axios.create({
  baseURL: EXPO_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      return Application.androidId || 'unknown-device';
    } else if (Platform.OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) || 'unknown-device';
    }
  } catch (e) {
    console.warn('[refreshTokenApi] device id read error', e);
  }
  return 'unknown-device';
}

// refreshClient.ts
refreshClient.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    const deviceId = await getDeviceId();
    const userLocale = Localization.getLocales()[0]?.languageTag || 'en-US';

    config.headers = {
      ...(config.headers || {}),
      'Device-Id': deviceId,
      'Accept-Language': userLocale,
    };

    console.log('[refreshClient] config', { url: config.url, data: config.data });
    
    // BỎ HOÀN TOÀN phần kiểm tra refresh-token trong interceptor
    // Việc kiểm tra refreshToken nên được thực hiện trong hàm refreshTokenApi
    return config;
  },
  (err) => Promise.reject(err)
);