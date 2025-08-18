// tokenStorageInteface.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface Storage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

// Storage cho web (sử dụng cookie)
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

// Storage cho mobile (sử dụng AsyncStorage/SecureStore)
class MobileStorage implements Storage {
  constructor(private isSecure: boolean = false) {}

  async setItem(key: string, value: string): Promise<void> {
    if (this.isSecure) {
      await SecureStore.setItemAsync(key, value, {
        keychainService: 'myAppRefreshToken',
      });
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (this.isSecure) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  }

  async removeItem(key: string): Promise<void> {
    if (this.isSecure) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
}

// Factory để chọn storage dựa trên môi trường
export const getStorage = (isSecure: boolean = false): Storage => {
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  return isWeb ? new CookieStorage() : new MobileStorage(isSecure);
};