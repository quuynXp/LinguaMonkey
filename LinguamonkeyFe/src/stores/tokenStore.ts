// tokenStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getStorage } from './tokenStoreInterface';
import { introspectToken } from '../services/authService';
import instance from '../api/axiosInstance';

interface TokenStore {
  accessToken: string | null;
  refreshToken: string | null;
  initialized: boolean;
  setTokens: (accessToken: string | null, refreshToken: string | null) => Promise<void>;
  clearTokens: () => Promise<void>;
  initializeTokens: () => Promise<boolean>;
}

const accessStorage = getStorage();        // AsyncStorage (mobile) / Cookie (web)
const refreshStorage = getStorage(true);   // SecureStore (mobile) / Cookie (web)

export const useTokenStore = create<TokenStore>((set) => ({
  accessToken: null,
  refreshToken: null,
  initialized: false,

  setTokens: async (accessToken, refreshToken) => {
    try {
      if (accessToken) {
        await accessStorage.setItem('accessToken', accessToken);
        console.log('Stored accessToken:', await accessStorage.getItem('accessToken')); // Debug
      }

      if (refreshToken) {
        await refreshStorage.setItem('refreshToken', refreshToken);
        console.log('Stored refreshToken:', await refreshStorage.getItem('refreshToken')); // Debug
      }

      // Always set hasLoggedIn to true if either token is provided
      if (accessToken || refreshToken) {
        await AsyncStorage.setItem('hasLoggedIn', 'true');
        console.log('Set hasLoggedIn to true');
      }

      set({ accessToken: accessToken ?? null, refreshToken: refreshToken ?? null });
    } catch (e) {
      console.error('setTokens error:', e);
      throw e; // Let caller handle errors
    }
  },

  clearTokens: async () => {
    try {
      await accessStorage.removeItem('accessToken');
      await refreshStorage.removeItem('refreshToken');
      console.log('Cleared tokens from storage'); // Debug
    } catch (e) {
      console.error('clearTokens storage error:', e);
    } finally {
      set({ accessToken: null, refreshToken: null });
      await AsyncStorage.setItem('hasLoggedIn', "false");
      await AsyncStorage.setItem("hasDonePlacementTest", "false");
      console.log('Reset hasLoggedIn and hasDonePlacementTest'); // Debug
    }
  },

  initializeTokens: async () => {
    try {
      const storedAccess = await accessStorage.getItem('accessToken');
      const storedRefresh = await refreshStorage.getItem('refreshToken');
      console.log('Retrieved from storage:', { storedAccess, storedRefresh });

      if (!storedRefresh) {
        console.log('No refresh token found, clearing tokens');
        set({ accessToken: null, refreshToken: null, initialized: true });
        return false;
      }

      if (storedAccess) {
        try {
          const valid = await introspectToken(storedAccess);
          console.log('Token introspection result:', valid);
          if (valid) {
            set({ accessToken: storedAccess, refreshToken: storedRefresh, initialized: true });
            return true;
          }
        } catch (e) {
          console.warn('introspectToken failed:', e);
        }
      }

      try {
        console.log('Attempting token refresh with:', storedRefresh);
        const res = await instance.post('/auth/refresh-token', { refreshToken: storedRefresh });
        const { token: newAccessToken, refreshToken: newRefreshToken } = res.data.result;
        console.log('Refresh token response:', { newAccessToken, newRefreshToken });
        await useTokenStore.getState().setTokens(newAccessToken, newRefreshToken);
        set({ accessToken: newAccessToken, refreshToken: newRefreshToken, initialized: true });
        return true;
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        set({ accessToken: null, refreshToken: storedRefresh, initialized: true });
        return false;
      }
    } catch (e) {
      console.error('initializeTokens error:', e);
      set({ accessToken: null, refreshToken: null, initialized: true });
      return false;
    }
  },
}));
