import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const getStorage = (isSecure = false) => ({
  setItem: async (key: string, value: string) => {
    if (isSecure) await SecureStore.setItemAsync(key, value);
    else await AsyncStorage.setItem(key, value);
  },
  getItem: async (key: string) => {
    if (isSecure) return await SecureStore.getItemAsync(key);
    return await AsyncStorage.getItem(key);
  },
  removeItem: async (key: string) => {
    if (isSecure) await SecureStore.deleteItemAsync(key);
    else await AsyncStorage.removeItem(key);
  }
});

interface TokenStore {
  accessToken: string | null;
  refreshToken: string | null;
  initialized: boolean;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  initializeTokens: () => Promise<boolean>;
}

const accessStorage = getStorage(false); // Access token lưu thường cũng được
const refreshStorage = getStorage(true); // Refresh token nên bảo mật

export const useTokenStore = create<TokenStore>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  initialized: false,

  setTokens: async (accessToken, refreshToken) => {
    console.log('💾 [TokenStore] Saving tokens...');
    await accessStorage.setItem('accessToken', accessToken);
    await refreshStorage.setItem('refreshToken', refreshToken);

    set({ accessToken, refreshToken, initialized: true });
  },

  clearTokens: async () => {
    console.log('🗑️ [TokenStore] Clearing tokens...');
    await accessStorage.removeItem('accessToken');
    await refreshStorage.removeItem('refreshToken');
    set({ accessToken: null, refreshToken: null, initialized: true });
  },

  initializeTokens: async () => {
    try {
      console.log('🔄 [TokenStore] Initializing...');
      const accessToken = await accessStorage.getItem('accessToken');
      const refreshToken = await refreshStorage.getItem('refreshToken');

      if (accessToken && refreshToken) {
        console.log('✅ [TokenStore] Tokens found');
        set({ accessToken, refreshToken, initialized: true });
        return true;
      }
    } catch (e) {
      console.warn('⚠️ [TokenStore] Load failed', e);
    }

    set({ accessToken: null, refreshToken: null, initialized: true });
    return false;
  }
}));