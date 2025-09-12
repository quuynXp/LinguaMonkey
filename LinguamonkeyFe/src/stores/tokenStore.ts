import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getStorage } from './tokenStoreInterface';

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
      if (accessToken) {
        const trimmedAccessToken = accessToken.trim();
        await accessStorage.setItem('accessToken', trimmedAccessToken);
        console.log('Stored accessToken (len):', trimmedAccessToken.length);
      } else {
        await accessStorage.removeItem('accessToken');
      }

      if (refreshToken) {
        const trimmedRefreshToken = refreshToken.trim();
        await refreshStorage.setItem('refreshToken', trimmedRefreshToken);
        console.log('Stored refreshToken (len):', trimmedRefreshToken.length);
      } else {
        await refreshStorage.removeItem('refreshToken');
      }

      if (accessToken || refreshToken) {
        await AsyncStorage.setItem('hasLoggedIn', 'true');
      }

      set({
        accessToken: accessToken ? accessToken.trim() : null,
        refreshToken: refreshToken ? refreshToken.trim() : null,
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
      await AsyncStorage.setItem('hasLoggedIn', "false");
      await AsyncStorage.setItem("hasDonePlacementTest", "false");
      console.log('Reset hasLoggedIn and hasDonePlacementTest');
    }
  },

  initializeTokens: async () => {
    try {
      const storedAccess = await accessStorage.getItem('accessToken');
      const storedRefresh = await refreshStorage.getItem('refreshToken');

      console.log('initializeTokens - storage:', {
        storedAccess: !!storedAccess,
        storedRefresh: !!storedRefresh,
        refreshTokenValue: storedRefresh ? `${storedRefresh.substring(0, 10)}...` : null
      });

      // 1) set token state ngay để các interceptor/request chờ không bị skip
      set({
        accessToken: storedAccess ?? null,
        refreshToken: storedRefresh ?? null,
        initialized: true, // <<--- important: mark initialized so interceptors can proceed/wait
      });

      // Nếu không có token nào thì return false
      if (!storedAccess && !storedRefresh) {
        return false;
      }

      // 2) Nếu có access, kiểm tra tính hợp lệ (non-blocking)
      if (storedAccess) {
        try {
          const { introspectToken } = await import('../services/authService');
          const valid = await introspectToken(storedAccess);
          console.log('introspectTokenApi result:', valid);
          if (valid) {
            // already set above, chỉ return true
            return true;
          }
        } catch (e) {
          console.warn('introspectTokenApi failed:', e);
          // tiếp tục sang refresh nếu có refresh token
        }
      }

      // 3) Nếu access không valid nhưng có refresh -> try refresh
      if (storedRefresh) {
        console.log('Attempting refresh with refreshToken');
        try {
          const { refreshTokenApi } = await import('../services/authService');
          // ensure refreshTokenApi accepts raw token and returns { token, refreshToken } OR tương tự
          const refreshResult = await refreshTokenApi(storedRefresh);
          console.log('Refresh result:', refreshResult);

          const newAccessToken = refreshResult?.token ?? refreshResult?.accessToken ?? refreshResult?.data?.accessToken;
          const newRefreshToken = refreshResult?.refreshToken ?? refreshResult?.refresh_token ?? refreshResult?.data?.refreshToken;

          if (!newAccessToken) {
            console.error('initializeTokens: refresh returned invalid result', refreshResult);
            // clear tokens in store and storage
            await useTokenStore.getState().clearTokens();
            return false;
          }

          // lưu token mới vào storage + store
          await useTokenStore.getState().setTokens(newAccessToken, newRefreshToken ?? storedRefresh);
          // ensure initialized remained true (we set it earlier)
          return true;
        } catch (refreshError) {
          console.error('initializeTokens refresh failed:', refreshError);
          await useTokenStore.getState().clearTokens();
          return false;
        }
      }

      // nếu tới đây, không thể xác thực -> false
      return false;
    } catch (e) {
      console.error('initializeTokens error:', e);
      // đảm bảo store không bị treo
      set({ accessToken: null, refreshToken: null, initialized: true });
      return false;
    }
  },


  getAccessTokenSync: () => {
    return get().accessToken;
  },
}));