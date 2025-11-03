import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getStorage } from './tokenStoreInterface';
import { refreshTokenPure } from '../services/authPure';
import { decodeToken } from '../utils/decodeToken';

const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const payload = decodeToken(token); // Dùng hàm decode bạn có
    if (payload && payload.exp) {
      // payload.exp là (seconds), Date.now() là (milliseconds)
      const isExpired = Date.now() >= payload.exp * 1000;
      return !isExpired;
    }
    return false;
  } catch (e) {
    console.warn('isTokenValid check failed', e);
    return false;
  }
};

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

      // BƯỚC 1: Kiểm tra accessToken trước tiên
      if (isTokenValid(accessToken)) {
        console.log('[initializeTokens] AccessToken is valid ✅ Using existing tokens.');
        set({
          accessToken,
          refreshToken,
          initialized: true,
        });
        return true; // Token hợp lệ, không cần refresh
      }

      // BƯỚC 2: AccessToken hết hạn (hoặc không có). Thử refresh nếu có refreshToken.
      if (refreshToken) {
        console.log('[initializeTokens] AccessToken invalid/expired. Attempting refresh...');
        try {
          const result = await refreshTokenPure(refreshToken);
          console.log('[initializeTokens] Refresh success ✅');
          await get().setTokens(result.token, result.refreshToken); // setTokens sẽ set state và initialized
          set({ initialized: true });
          return true;
        } catch (e: any) {
          // BƯỚC 3: Refresh thất bại. Đây là lúc cần dọn dẹp.
          console.error('[initializeTokens] Refresh failed ❌', e?.message);
          await get().clearTokens(); // Chỉ xóa khi refresh thất bại
          set({ initialized: true });
          return false;
        }
      }

      // BƯỚC 4: Không có accessToken hợp lệ VÀ cũng không có refreshToken.
      console.log('[initializeTokens] No valid tokens found.');
      set({ initialized: true });
      return false;

    } catch (e: any) {
      // Lỗi không mong muốn
      console.error('[initializeTokens] Unexpected error:', e);
      await get().clearTokens(); // Dọn dẹp nếu có lỗi nghiêm trọng
      set({ initialized: true });
      return false;
    }
  },

  getAccessTokenSync: () => get().accessToken,
}));
