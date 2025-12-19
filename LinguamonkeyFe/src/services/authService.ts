import AsyncStorage from '@react-native-async-storage/async-storage';
import { publicClient, privateClient } from '../api/axiosClient';
import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';
import { resetToAuth, resetToTab, gotoTab } from '../utils/navigationRef';
import { decodeToken, getRolesFromToken } from '../utils/decodeToken';
import eventBus from '../events/appEvents';
import { AxiosRequestConfig } from 'axios';
import NotificationService from './notificationService';
import mmkvStorage from '../utils/storage';

export const authService = {

  getUserProfile: async (userId: string, manuallyToken?: string) => {
    if (manuallyToken) {
      const config: AxiosRequestConfig = {
        headers: {
          Authorization: `Bearer ${manuallyToken}`
        }
      };
      const res = await publicClient.get(`/api/v1/users/${userId}`, config);
      return res.data.result;
    } else {
      const res = await privateClient.get(`/api/v1/users/${userId}`);
      return res.data.result;
    }
  },

  handleLoginSuccess: async (accessToken: string, refreshToken: string) => {
    try {
      if (!accessToken || !refreshToken) throw new Error('Tokens missing');

      useTokenStore.getState().setTokens(accessToken, refreshToken);

      let payload;
      try {
        payload = decodeToken(accessToken);
      } catch (e) {
        console.warn('[AuthService] Decode token warning:', e);
      }

      const userId = payload?.userId || payload?.sub;
      if (!userId) throw new Error('Invalid Token Payload: Cannot extract UserID');

      const userProfile = await authService.getUserProfile(userId, accessToken);

      const normalizedUser = {
        ...userProfile,
        userId: userProfile.userId ?? userProfile.id,
        roles: getRolesFromToken(accessToken),
      };

      useUserStore.getState().setUser(normalizedUser);
      useUserStore.getState().setAuthenticated(true);

      try {
        await NotificationService.registerTokenToBackend();
      } catch (fcmError) {
        console.warn('[AuthService] FCM Registration failed, ignoring to keep session alive:', fcmError);
      }

      eventBus.emit('logged_in', { userId: normalizedUser.userId, token: accessToken });

    } catch (error: any) {
      console.error('[AuthService] Handle Login Failed:', error.response?.data || error.message);

      if (error.response?.status === 401) {
        await authService.logout();
      }
      throw error;
    }
  },

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

  changePasswordForAuthenticatedUser: async (userId: string, currentPassword: string, newPassword: string) => {
    try {
      const res = await privateClient.post(`/api/v1/users/${userId}/change-password`, {
        currentPassword,
        newPassword
      });
      if (res.status === 200 || res.status === 204 || res.data.code === 200) {
        return true;
      }
      throw new Error(res.data?.message || 'Password update failed');
    } catch (error: any) {
      console.error('[AuthService] Change Password Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to change password');
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
      mmkvStorage.clearChatCache();
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