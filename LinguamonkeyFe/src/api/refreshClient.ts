import axios, { AxiosRequestConfig } from 'axios';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import {EXPO_PUBLIC_API_BASE_URL} from "react-native-dotenv"
import { showError, showSuccess } from '../utils/toastHelper';

const API_BASE_URL = EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;

export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() || 'unknown-device';
    } else if (Platform.OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) || 'unknown-device';
    }
  } catch (e) {
    console.warn('[refreshTokenApi] device id read error', e);
  }
  return 'unknown-device';
}

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
    
    return config;
  },
  (err) => Promise.reject(err)
);

refreshClient.interceptors.response.use(
  (response) => {
    if (response.data?.message) {
      showSuccess(response.data.message);
    }
    return response;
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || "Unknown error";
    showError(msg);
    return Promise.reject(error);
  }
);
