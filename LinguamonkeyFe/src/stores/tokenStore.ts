import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getStorage } from './tokenStoreInterface';
import { refreshTokenPure } from '../services/authPure';

interface TokenStore {
  accessToken: string | null;
  refreshToken: string | null;
  initialized: boolean;
  setTokens: (accessToken: string | null, refreshToken: string | null) => Promise<void>;
  clearTokens: () => Promise<void>;
  initializeTokens: () => Promise<boolean>;
  getAccessTokenSync: () => string | null;
}

const accessStorage = getStorage();
const refreshStorage = getStorage(true);

export const useTokenStore = create<TokenStore>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  initialized: false,

  setTokens: async (accessToken, refreshToken) => {
    try {
      const trimmedAccess =
        typeof accessToken === 'string' ? accessToken.trim() : null;
      const trimmedRefresh =
        typeof refreshToken === 'string' ? refreshToken.trim() : null;

      if (trimmedAccess) {
        await accessStorage.setItem('accessToken', trimmedAccess);
        console.log('Stored accessToken length:', trimmedAccess.length);
      } else {
        await accessStorage.removeItem('accessToken');
      }

      if (trimmedRefresh) {
        await refreshStorage.setItem('refreshToken', trimmedRefresh);
        console.log('Stored refreshToken length:', trimmedRefresh.length);
      } else {
        await refreshStorage.removeItem('refreshToken');
      }

      if (trimmedAccess || trimmedRefresh) {
        await AsyncStorage.setItem('hasLoggedIn', 'true');
      }

      set({
        accessToken: trimmedAccess,
        refreshToken: trimmedRefresh,
      });
    } catch (e) {
      console.error('setTokens error:', e);
      throw e;
    }
  },


  clearTokens: async () => {
    try {
      await accessStorage.removeItem('accessToken');
      await refreshStorage.removeItem('refreshToken');
      console.log('Cleared tokens from storage');
    } catch (e) {
      console.error('clearTokens storage error:', e);
    } finally {
      set({ accessToken: null, refreshToken: null });
      await AsyncStorage.setItem('hasLoggedIn', 'false');
      await AsyncStorage.setItem('hasDonePlacementTest', 'false');
      console.log('Reset hasLoggedIn and hasDonePlacementTest');
    }
  },

  initializeTokens: async () => {
    try {
      const storedAccess = await accessStorage.getItem('accessToken');
      const storedRefresh = await refreshStorage.getItem('refreshToken');

      const accessToken = typeof storedAccess === 'string' ? storedAccess.trim() : null;
      const refreshToken = typeof storedRefresh === 'string' ? storedRefresh.trim() : null;

      if (!accessToken && !refreshToken) {
        console.log('[initializeTokens] No tokens found → skip refresh');
        set({ initialized: true });
        return false;
      }

      set({
        accessToken,
        refreshToken,
        initialized: true,
      });

      if (refreshToken) {
        console.log('[initializeTokens] Attempting refresh with refreshToken...');
        try {
          const result = await refreshTokenPure(refreshToken);
          console.log('[initializeTokens] Refresh success ✅');
          await get().setTokens(result.token, result.refreshToken);
          return true;
        } catch (e: any) {
          console.error('[initializeTokens] Refresh failed ❌', e?.message);
          await get().clearTokens();
          return false;
        }
      }

      console.log('[initializeTokens] Only accessToken found → use as is');
      return true;
    } catch (e: any) {
      console.error('[initializeTokens] Unexpected error:', e);
      await get().clearTokens();
      return false;
    }
  },

  getAccessTokenSync: () => get().accessToken,
}));
