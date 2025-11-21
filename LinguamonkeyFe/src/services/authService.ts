import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';
import { decodeToken, getRoleFromToken } from '../utils/decodeToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToTab, resetToAuth, gotoTab } from "../utils/navigationRef";
import * as WebBrowser from 'expo-web-browser';
import { refreshClient } from '../api/refreshClient';
import instance from '../api/axiosInstance';

WebBrowser.maybeCompleteAuthSession();

// Login bằng Email/Pass
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/login', { email, password });
    if (res.data.result && res.data.result.authenticated) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Email login error:', error);
    throw error;
  }
  return false;
};

// Google Login
export const handleGoogleLogin = async (idToken: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/google-login', { idToken });
    await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
    return true;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

// Facebook Login
export const handleFacebookLogin = async (accessToken: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/facebook-login', { accessToken });
    await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
    return true;
  } catch (error) {
    console.error('Facebook login error:', error);
    throw error;
  }
}

// Logout
export const logout = async () => {
  try {
    await refreshClient.post('/api/v1/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    await useTokenStore.getState().clearTokens();
    useUserStore.getState().setUser(null);
    useUserStore.getState().setAuthenticated(false);
    resetToAuth('Login');
  }
};

// Request OTP (chung cho login/register phone và email)
export const requestOtp = async (emailOrPhone: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/request-otp', { emailOrPhone });
    return res.data.result?.success || false;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to request OTP');
  }
};

// Verify OTP và Login luôn
export const verifyOtpAndLogin = async (emailOrPhone: string, otpCode: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/verify-otp', { emailOrPhone, code: otpCode });
    if (res.data.result?.token && res.data.result?.refreshToken) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error: any) {
    console.error('OTP login error:', error);
    throw new Error(error.response?.data?.message || 'Verification failed');
  }
  return false;
};

// Đăng ký (chỉ tạo user, sau đó thường sẽ login luôn hoặc verify email)
export const registerWithEmail = async (firstName: string, lastName: string, email: string, password: string) => {
  try {
    const fullname = `${firstName} ${lastName}`;
    await refreshClient.post('/api/v1/auth/register', {
      fullname,
      email: email.toLowerCase(),
      password
    });
    // Sau đăng ký thành công, login luôn
    return await loginWithEmail(email, password);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// --- PASSWORD RESET API ---

export const checkResetMethods = async (identifier: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/check-reset-methods', { identifier });
    return res.data.result;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Account not found');
  }
};

export const requestPasswordResetOtp = async (identifier: string, method: 'EMAIL' | 'PHONE') => {
  try {
    await refreshClient.post('/api/v1/auth/request-password-reset-otp', { identifier, method });
    return true;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

export const verifyPasswordResetOtp = async (identifier: string, code: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/verify-password-reset-otp', { identifier, code });
    if (!res.data.result?.resetToken) {
      throw new Error('Invalid response: missing resetToken');
    }
    return res.data.result.resetToken;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Invalid OTP');
  }
};

export const resetPassword = async (secureToken: string, newPassword: string) => {
  try {
    await refreshClient.post('/api/v1/auth/reset-password', { token: secureToken, password: newPassword });
    return true;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to reset password');
  }
};

// Xử lý khi login thành công (Lưu token, lấy info user, điều hướng)
async function handleLoginSuccess(token: string, refreshToken: string) {
  try {
    if (!token || !refreshToken) throw new Error('Tokens missing');

    await useTokenStore.getState().setTokens(token, refreshToken);
    const payload = decodeToken(token);

    if (!payload?.userId) throw new Error('Invalid token payload');

    const userRes = await instance.get(`/api/v1/users/${payload.userId}`);
    const rawUser = userRes.data.result || {};

    const normalizedUser = {
      ...rawUser,
      userId: rawUser.userId ?? rawUser.user_id ?? rawUser.id,
      roles: getRoleFromToken(token),
    };

    useUserStore.getState().setUser(normalizedUser);
    useUserStore.getState().setAuthenticated(true);
    await AsyncStorage.setItem("hasLoggedIn", "true");

    const hasFinishedSetup = (await AsyncStorage.getItem("hasFinishedSetup")) === "true";
    if (!hasFinishedSetup && !normalizedUser.roles.includes('ROLE_ADMIN')) {
      gotoTab('SetupInitScreen');
      return;
    }

    if (normalizedUser.roles.includes('ROLE_ADMIN')) resetToTab('Admin');
    else if (normalizedUser.roles.includes('ROLE_TEACHER')) resetToTab('Teacher');
    else resetToTab('Home');

  } catch (e) {
    console.error('handleLoginSuccess error:', e);
    resetToAuth('Login');
    throw e;
  }
}

export const refreshTokenApi = async (refreshToken: string, deviceId?: string, ip?: string, userAgent?: string) => {
  if (!refreshToken || !refreshToken.trim()) {
    throw new Error('Missing refreshToken');
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Refresh-Caller': 'client',
    };
    if (deviceId) headers['Device-Id'] = deviceId;
    if (ip) headers['X-Forwarded-For'] = ip;
    if (userAgent) headers['User-Agent'] = userAgent;

    const body = { refreshToken: refreshToken.trim() };
    const res = await refreshClient.post('/api/v1/auth/refresh-token', body, { headers });

    if (!res.data?.result?.token || !res.data?.result?.refreshToken) {
      throw new Error('Invalid refresh response format');
    }

    return { token: res.data.result.token, refreshToken: res.data.result.refreshToken };
  } catch (error: any) {
    throw error;
  }
};

export const introspectToken = async (token: string) => {
  if (!token?.trim()) return false;
  try {
    const res = await refreshClient.post(
      '/api/v1/auth/introspect',
      {},
      { headers: { Authorization: `Bearer ${token.trim()}` } }
    );
    return !!res.data?.result?.valid;
  } catch (e: any) {
    return false;
  }
};