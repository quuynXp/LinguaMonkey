// authService.ts
import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';
import { decodeToken, getRoleFromToken } from '../utils/decodeToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToTab, resetToAuth } from "../utils/navigationRef";
import { loginWithGoogleFirebase, loginWithFacebookFirebase } from './firebaseService';
import { EXPO_PUBLIC_API_BASE_URL } from '@env';
import axios from 'axios';

export const refreshClient = axios.create({
  baseURL: EXPO_PUBLIC_API_BASE_URL,
  withCredentials: true, // giữ nếu server dựa trên cookie; nhưng we rely on body refreshToken
  // không throw trong interceptor ở đây
});

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const res = await refreshClient.post('/auth/login', { email, password });
    if (res.data.result.authenticated) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Email login error:', error);
  }
  return false;
};

export async function loginWithGoogle() {
  try {
    const idToken = await loginWithGoogleFirebase();
    const res = await refreshClient.post('/auth/firebase-login', {}, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
    return true;
  } catch (error) {
    console.error('Google login error:', error);
    return false;
  }
}

export async function loginWithFacebook() {
  try {
    const idToken = await loginWithFacebookFirebase();
    const res = await refreshClient.post('/auth/firebase-login', {}, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
    return true;
  } catch (error) {
    console.error('Facebook login error:', error);
    return false;
  }
}

export const logout = async () => {
  try {
    await refreshClient.post('/auth/logout');
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
    console.log('Login response:', { token, refreshToken });
    refreshClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const payload = decodeToken(token);
    if (!payload?.userId) {
      throw new Error('Invalid token payload: missing userId');
    }

    useUserStore.getState().setUserId(payload.userId);
    const userRes = await refreshClient.get(`/users/${payload.userId}`);
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
    await useTokenStore.getState().clearTokens();
    resetToAuth('Login');
  }
}

export const registerWithEmail = async (firstName: string, lastName: string, email: string, password: string) => {
  const fullname = `${firstName} ${lastName}`;
  await refreshClient.post('/users', { fullname, email, password });
};

export const sendPasswordReset = async (email: string) => {
  await refreshClient.post('/auth/forgot-password', { email });
};

export const verifyResetCode = async (email: string, code: string) => {
  const res = await refreshClient.post('/auth/verify-code', { email, code });
  return res.data.result.resetToken;
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
      'X-Refresh-Caller': 'client', // helpful to filter on server/logs
    };
    if (deviceId) headers['Device-Id'] = deviceId;
    if (ip) headers['X-Forwarded-For'] = ip;
    if (userAgent) headers['User-Agent'] = userAgent;

    const body = { refreshToken: refreshToken.trim() };

    console.log('[refreshTokenApi] sending request /auth/refresh-token', { headers, body: { refreshToken: '***' } });

    const res = await refreshClient.post('/auth/refresh-token', body, { headers });

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