import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';
import { decodeToken, getRoleFromToken } from '../utils/decodeToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToTab, resetToAuth, gotoTab } from "../utils/navigationRef";
// import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
// import { API_BASE_URL } from '../api/apiConfig';
import instance from '../api/axiosInstance';
import { refreshClient } from '../api/refreshClient';

WebBrowser.maybeCompleteAuthSession();

// export const refreshClient = axios.create({
//   baseURL: API_BASE_URL,
//   withCredentials: true,
// });

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/login', { email, password });
    if (res.data.result.authenticated) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Email login error:', error);
    throw error;
  }
  return false;
};

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

async function handleLoginSuccess(token: string, refreshToken: string) {
  try {
    if (!token || !refreshToken) {
      throw new Error('Invalid login response: missing token or refreshToken');
    }

    await useTokenStore.getState().setTokens(token, refreshToken);
    console.log('Login response:', { token: '...', refreshToken: '...' });

    const payload = decodeToken(token);
    if (!payload?.userId) {
      throw new Error('Invalid token payload: missing userId');
    }

    const userRes = await instance.get(
      `/api/v1/users/${payload.userId}`
    );

    const rawUser = userRes.data.result || {};
    const normalizedUser = {
      ...rawUser,
      userId: rawUser.userId ?? rawUser.user_id ?? rawUser.id,
      roles: getRoleFromToken(token),
    };

    useUserStore.getState().setUser(normalizedUser);
    useUserStore.getState().setAuthenticated(true);
    await AsyncStorage.setItem("hasLoggedIn", "true");

    console.log('User roles:', normalizedUser.roles);

    const hasFinishedSetup =
      (await AsyncStorage.getItem("hasFinishedSetup")) === "true";

    if (!hasFinishedSetup && !normalizedUser.roles.includes('ROLE_ADMIN')) {
      console.log('Login success, but user has not finished setup. Navigating to SetupInitScreen.');
      gotoTab('SetupInitScreen');
      return;
    }

    let targetRoute: 'Admin' | 'Teacher' | 'DailyWelcome' | 'Home' = 'Home';

    if (normalizedUser.roles.includes('ROLE_ADMIN')) {
      targetRoute = 'Admin';
    } else if (normalizedUser.roles.includes('ROLE_TEACHER')) {
      targetRoute = 'Teacher';
    } else {
      const currentDate = new Date().toLocaleDateString('en-CA');
      const lastAppOpenDate = await AsyncStorage.getItem('lastAppOpenDate');
      const isFirstOpenToday = lastAppOpenDate !== currentDate;
      if (isFirstOpenToday) {
        targetRoute = 'DailyWelcome';
        try {
          await AsyncStorage.setItem('lastAppOpenDate', currentDate);
        } catch (e) {
          console.warn('Failed to set lastAppOpenDate', e);
        }
      }
    }

    console.log('DEBUG navigate targetRoute:', targetRoute);
    resetToTab(targetRoute);
  } catch (e) {
    console.error('handleLoginSuccess error:', e);
    resetToAuth('Login');
    throw e;
  }
}

export const requestOtp = async (emailOrPhone: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/request-otp', { emailOrPhone });
    return res.data.result?.success || false;
  } catch (error: any) {
    console.error('Request OTP error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to request OTP');
  }
};

export const verifyOtpLogin = async (emailOrPhone: string, otpCode: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/verify-otp', { emailOrPhone, code: otpCode });
    if (res.data.result?.token && res.data.result?.refreshToken) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('OTP login error:', error);
  }
  return false;
};

export const registerWithEmail = async (firstName: string, lastName: string, email: string, password: string) => {
  try {
    const fullname = `${firstName} ${lastName}`;

    await refreshClient.post('/api/v1/auth/register', {
      fullname,
      email: email.toLowerCase(),
      password
    });

    console.log('Registration successful, attempting login...');
    return await loginWithEmail(email, password);

  } catch (error: any) {
    console.error('Register with email error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const checkResetMethods = async (identifier: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/check-reset-methods', { identifier });
    return res.data.result as { hasEmail: boolean; hasPhone: boolean; email?: string; phone?: string; };
  } catch (error: any) {
    console.error('Check reset methods error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to check account');
  }
};

export const requestPasswordResetOtp = async (identifier: string, method: 'EMAIL' | 'PHONE') => {
  try {
    await refreshClient.post('/api/v1/auth/request-password-reset-otp', { identifier, method });
    return true;
  } catch (error: any) {
    console.error('Request password reset OTP error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

export const verifyPasswordResetOtp = async (identifier: string, code: string) => {
  try {
    const res = await refreshClient.post('/api/v1/auth/verify-password-reset-otp', { identifier, code });
    if (!res.data.result?.resetToken) {
      throw new Error('Invalid response from server: missing resetToken');
    }
    return res.data.result.resetToken as string;
  } catch (error: any) {
    console.error('Verify password reset OTP error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Invalid or expired OTP');
  }
};

export const resetPassword = async (resetToken: string, newPassword: string) => {
  await refreshClient.post('/auth/reset-password', { token: resetToken, password: newPassword });
};

export const refreshTokenApi = async (refreshToken: string, deviceId?: string, ip?: string, userAgent?: string) => {
  if (!refreshToken || !refreshToken.trim()) {
    console.error('[refreshTokenApi] called with EMPTY refreshToken -> throw and trace', { stack: new Error().stack });
    throw new Error('Missing refreshToken');
  }

  const masked = refreshToken.trim().substring(0, 10) + '...';
  console.log('[refreshTokenApi] called, maskedRefresh:', masked);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Refresh-Caller': 'client',
    };
    if (deviceId) headers['Device-Id'] = deviceId;
    if (ip) headers['X-Forwarded-For'] = ip;
    if (userAgent) headers['User-Agent'] = userAgent;

    const body = { refreshToken: refreshToken.trim() };

    console.log('[refreshTokenApi] sending request /api/v1/auth/refresh-token', { headers, body: { refreshToken: '***' } });

    const res = await refreshClient.post('/api/v1/auth/refresh-token', body, { headers });

    console.log('[refreshTokenApi] response', { status: res.status, dataSummary: res.data?.result ? 'has-result' : 'no-result' });

    if (!res.data?.result?.token || !res.data?.result?.refreshToken) {
      console.error('[refreshTokenApi] invalid refresh response format', res.data);
      throw new Error('Invalid refresh response format');
    }

    return { token: res.data.result.token, refreshToken: res.data.result.refreshToken };
  } catch (error: any) {
    console.error('[refreshTokenApi] error:', error.response?.data || error.message, { stack: error.stack });
    throw error;
  }
};


export const introspectToken = async (token: string) => {
  if (!token?.trim()) {
    console.warn('Introspect token error: empty token');
    return false;
  }

  try {
    const res = await refreshClient.post(
      '/auth/introspect',
      {},
      {
        headers: {
          Authorization: `Bearer ${token.trim()}`
        },
        withCredentials: true
      }
    );

    return !!res.data?.result?.valid;
  } catch (e: any) {
    console.warn('Introspect token error:', e.response?.data || e.message);
    return false;
  }
};