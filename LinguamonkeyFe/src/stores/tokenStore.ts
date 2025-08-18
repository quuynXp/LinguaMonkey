// tokenStore.ts
import { create } from 'zustand';
import { getStorage } from './tokenStoreInterface';
import { introspectToken, refreshToken } from '../api/authApi';
import { Platform } from 'react-native';

interface TokenStore {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (accessToken: string | null, refreshToken: string | null) => Promise<void>;
  clearTokens: () => Promise<void>;
  initializeTokens: () => Promise<boolean>;
}

const accessStorage = getStorage(); // AsyncStorage hoặc Cookie cho accessToken
const refreshStorage = getStorage(true); // SecureStore hoặc Cookie cho refreshToken

export const useTokenStore = create<TokenStore>((set) => ({
  accessToken: null,
  refreshToken: null,

  setTokens: async (accessToken, refreshToken) => {
    const prefix = Platform.OS; // 'web', 'ios', 'android'
    if (accessToken) {
      await accessStorage.setItem(`${prefix}_accessToken`, accessToken);
    }
    if (refreshToken) {
      await refreshStorage.setItem(`${prefix}_refreshToken`, refreshToken);
    }
  },

  clearTokens: async () => {
    set({ accessToken: null, refreshToken: null });
    await accessStorage.removeItem('accessToken');
    await refreshStorage.removeItem('refreshToken');
  },

  initializeTokens: async () => {
    const storedAccess = await accessStorage.getItem('accessToken');
    const storedRefresh = await refreshStorage.getItem('refreshToken');

    if (storedAccess) {
      const valid = await introspectToken(storedAccess);
      if (valid) {
        set({ accessToken: storedAccess, refreshToken: storedRefresh });
        return true;
      }
    }

    if (storedRefresh) {
      const refreshResult = await refreshToken(storedRefresh);
      if (refreshResult?.token && refreshResult?.refreshToken) {
        await useTokenStore.getState().setTokens(refreshResult.token, refreshResult.refreshToken);
        return true;
      }
    }

    await useTokenStore.getState().clearTokens();
    return false;
  },
}));

export const getCurrentPlatformToken = async () => {
  const prefix = Platform.OS;
  return await accessStorage.getItem(`${prefix}_accessToken`);
};