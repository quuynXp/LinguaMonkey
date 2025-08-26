import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface Storage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

// Storage cho web
class CookieStorage implements Storage {
  setItem(key: string, value: string): Promise<void> {
    document.cookie = `${key}=${value}; path=/; max-age=31536000; secure; samesite=strict`;
    return Promise.resolve();
  }

  getItem(key: string): Promise<string | null> {
    const value = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${key}=`))
      ?.split('=')[1];
    return Promise.resolve(value || null);
  }

  removeItem(key: string): Promise<void> {
    document.cookie = `${key}=; path=/; max-age=0`;
    return Promise.resolve();
  }
}

// Storage cho mobile
class MobileStorage implements Storage {
  constructor(private isSecure: boolean = false) { }

  async setItem(key: string, value: string): Promise<void> {
    if (this.isSecure) {
      console.log('SecureStore setItem:', key, value); // Debug
      await SecureStore.setItemAsync(key, value, {
        keychainService: 'myAppRefreshToken',
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      console.log('AsyncStorage setItem:', key, value); // Debug
      await AsyncStorage.setItem(key, value);
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isSecure) {
      const value = await SecureStore.getItemAsync(key, { keychainService: 'myAppRefreshToken' });
      console.log('SecureStore getItem:', key, value); // Debug
      return value;
    } else {
      const value = await AsyncStorage.getItem(key);
      console.log('AsyncStorage getItem:', key, value); // Debug
      return value;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (this.isSecure) {
      console.log('SecureStore removeItem:', key); // Debug
      await SecureStore.deleteItemAsync(key, { keychainService: 'myAppRefreshToken' });
    } else {
      console.log('AsyncStorage removeItem:', key); // Debug
      await AsyncStorage.removeItem(key);
    }
  }
}

export const getStorage = (isSecure: boolean = false): Storage => {
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  return isWeb ? new CookieStorage() : new MobileStorage(isSecure);
};
