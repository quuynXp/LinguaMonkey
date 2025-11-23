import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicClient, privateClient } from '../api/axiosClient';
import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';
import { resetToAuth, resetToTab, gotoTab } from '../utils/navigationRef';
import { decodeToken, getRoleFromToken } from '../utils/decodeToken';
import eventBus from '../events/appEvents';
import { AxiosRequestConfig } from 'axios'; // Thêm import này để type check chuẩn hơn

export const authService = {

  // 🔥 SỬA ĐOẠN NÀY: Tách biệt rõ ràng logic gọi API User
  getUserProfile: async (userId: string, manuallyToken?: string) => {
    if (manuallyToken) {
      // TRƯỜNG HỢP 1: Vừa login xong, Token chưa kịp vào Store.
      // Dùng publicClient để tránh Interceptor của privateClient can thiệp.
      // Tự tay gắn Header vào, chắc chắn 100% Backend sẽ nhận được.
      const config: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${manuallyToken}`
        }
      };
      const res = await publicClient.get(`/api/v1/users/${userId}`, config);
      return res.data.result;
    } else {
      // TRƯỜNG HỢP 2: App đang chạy bình thường, Token đã nằm trong Store.
      // Dùng privateClient để tận dụng tính năng tự refresh token.
      const res = await privateClient.get(`/api/v1/users/${userId}`);
      return res.data.result;
    }
  },

  handleLoginSuccess: async (accessToken: string, refreshToken: string) => {
    try {
      if (!accessToken || !refreshToken) throw new Error('Tokens missing');

      // 1. Lưu token (Vẫn lưu để dùng cho lần sau)
      // Không await ở đây cũng được để tăng tốc độ, hoặc await cũng không sao
      useTokenStore.getState().setTokens(accessToken, refreshToken);

      // 2. Decode Token
      let payload;
      try {
        payload = decodeToken(accessToken);
      } catch (e) {
        // Fix lỗi "nbf must be a number" nếu token format lạ
        console.warn('[AuthService] Decode token warning:', e);
      }

      // Fallback nếu decode lỗi nhưng server vẫn trả về token
      const userId = payload?.userId || payload?.sub;
      if (!userId) throw new Error('Invalid Token Payload: Cannot extract UserID');

      // 3. Gọi API lấy info user (Truyền accessToken trực tiếp!)
      console.log('[AuthService] Fetching profile for:', userId);
      const userProfile = await authService.getUserProfile(userId, accessToken);

      // 4. Chuẩn hóa dữ liệu User
      const normalizedUser = {
        ...userProfile,
        userId: userProfile.userId ?? userProfile.id,
        roles: getRoleFromToken(accessToken),
      };

      // 5. Update Store & Navigate
      useUserStore.getState().setUser(normalizedUser);
      useUserStore.getState().setAuthenticated(true);
      await AsyncStorage.setItem('hasLoggedIn', 'true');

      eventBus.emit('logged_in', { userId: normalizedUser.userId, token: accessToken });

      const hasFinishedSetup = (await AsyncStorage.getItem('hasFinishedSetup')) === 'true';
      if (!hasFinishedSetup && !normalizedUser.roles.includes('ROLE_ADMIN')) {
        gotoTab('SetupInitScreen');
      } else {
        resetToTab('Home');
      }

    } catch (error: any) {
      console.error('[AuthService] Handle Login Failed:', error.response?.data || error.message);

      // Chỉ logout nếu lỗi là 401 thật sự từ server khi gọi getUserProfile
      if (error.response?.status === 401) {
        await authService.logout();
      }
      throw error;
    }
  },

  // --- CÁC HÀM DƯỚI GIỮ NGUYÊN ---

  loginWithEmail: async (email: string, password: string) => {
    try {
      const res = await publicClient.post('/api/v1/auth/login', { email, password });
      const { token, refreshToken } = res.data?.result || {};
      if (token && refreshToken) {
        await authService.handleLoginSuccess(token, refreshToken);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('[AuthService] Email Login Error:', error.response?.data || error.message);
      throw error;
    }
  },

  handleGoogleLogin: async (idToken: string) => {
    try {
      const res = await publicClient.post('/api/v1/auth/google-login', { idToken });
      const { token, refreshToken } = res.data?.result || {};
      if (token && refreshToken) {
        await authService.handleLoginSuccess(token, refreshToken);
        return true;
      }
    } catch (error) {
      console.error('[AuthService] Google Login Error:', error);
      throw error;
    }
  },

  handleFacebookLogin: async (accessToken: string) => {
    try {
      const res = await publicClient.post('/api/v1/auth/facebook-login', { accessToken });
      const { token, refreshToken } = res.data?.result || {};
      if (token && refreshToken) {
        await authService.handleLoginSuccess(token, refreshToken);
        return true;
      }
    } catch (error) {
      console.error('[AuthService] Facebook Login Error:', error);
      throw error;
    }
  },

  requestOtp: async (emailOrPhone: string) => {
    try {
      const res = await publicClient.post('/api/v1/auth/request-otp', { emailOrPhone });
      return res.data.result?.success || false;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to request OTP');
    }
  },

  verifyOtpAndLogin: async (emailOrPhone: string, otpCode: string) => {
    try {
      const res = await publicClient.post('/api/v1/auth/verify-otp', { emailOrPhone, code: otpCode });
      const { token, refreshToken } = res.data?.result || {};
      if (token && refreshToken) {
        await authService.handleLoginSuccess(token, refreshToken);
        return true;
      }
    } catch (error: any) {
      console.error('[AuthService] OTP Verify Error:', error);
      throw new Error(error.response?.data?.message || 'Verification failed');
    }
    return false;
  },

  registerWithEmail: async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      const fullname = `${firstName} ${lastName}`;
      await publicClient.post('/api/v1/auth/register', {
        fullname,
        email: email.toLowerCase(),
        password
      });
      return await authService.loginWithEmail(email, password);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  },

  checkResetMethods: async (identifier: string) => {
    try {
      const res = await publicClient.post('/api/v1/auth/check-reset-methods', { identifier });
      return res.data.result;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Account not found');
    }
  },

  requestPasswordResetOtp: async (identifier: string, method: 'EMAIL' | 'PHONE') => {
    try {
      await publicClient.post('/api/v1/auth/request-password-reset-otp', { identifier, method });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send OTP');
    }
  },

  verifyPasswordResetOtp: async (identifier: string, code: string) => {
    try {
      const res = await publicClient.post('/api/v1/auth/verify-password-reset-otp', { identifier, code });
      if (!res.data.result?.resetToken) {
        throw new Error('Invalid response: missing resetToken');
      }
      return res.data.result.resetToken;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Invalid OTP');
    }
  },

  resetPassword: async (secureToken: string, newPassword: string) => {
    try {
      await publicClient.post('/api/v1/auth/reset-password', { token: secureToken, password: newPassword });
      return true;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset password');
    }
  },

  introspectToken: async (token: string) => {
    if (!token?.trim()) return false;
    try {
      const res = await publicClient.post(
        '/api/v1/auth/introspect',
        {},
        { headers: { Authorization: `Bearer ${token.trim()}` } }
      );
      return !!res.data?.result?.valid;
    } catch (e: any) {
      return false;
    }
  },

  logout: async () => {
    try {
      await publicClient.post('/api/v1/auth/logout').catch(() => { });
    } finally {
      await useTokenStore.getState().clearTokens();
      useUserStore.getState().logout();
      await AsyncStorage.removeItem('hasLoggedIn');
      resetToAuth();
      eventBus.emit('logged_out');
    }
  }
};

eventBus.on('logout', () => {
  authService.logout();
});