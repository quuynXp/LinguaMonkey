import axiosInstance from '../api/axiosInstance';
import { useTokenStore } from '../stores/tokenStore';
import { createNavigationContainerRef } from '@react-navigation/native';
import { loginWithGoogleFirebase, loginWithFacebookFirebase } from './firebaseService';
import { Alert } from 'react-native';
import { useUserStore } from '../stores/UserStore';
import { decodeToken } from '../utils/decodeToken';

export const RootNavigation = createNavigationContainerRef();

// Login with email/password
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const res = await axiosInstance.post('/auth/login', { email, password });
    console.log('Login response:', res.data.result);
    if (res.data.result.authenticated) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    } else {
      Alert.alert('Login Failed', res.data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Login error:', error);
  }
  return false;
};
export async function loginWithGoogle() {
  const idToken = await loginWithGoogleFirebase();
  const res = await axiosInstance.post('/auth/firebase-login', {}, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
}

export async function loginWithFacebook() {
  const idToken = await loginWithFacebookFirebase();
  const res = await axiosInstance.post('/auth/firebase-login', {}, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
}

// Logout
export const logout = async () => {
  try {
    await axiosInstance.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    await useTokenStore.getState().clearTokens();
    RootNavigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }
};

// Register with email
export const registerWithEmail = async (firstName: string, lastName: string, email: string, password: string) => {
  const fullname = `${firstName} ${lastName}`;
  await axiosInstance.post('/auth/register', { fullname, email, password });
};

// Send password reset email
export const sendPasswordReset = async (email: string) => {
  await axiosInstance.post('/auth/forgot-password', { email });
};

// Verify reset code
export const verifyResetCode = async (email: string, code: string) => {
  const res = await axiosInstance.post('/auth/verify-code', { email, code });
  return res.data.result.resetToken;
};

// Reset password
export const resetPassword = async (resetToken: string, newPassword: string) => {
  await axiosInstance.post('/auth/reset-password', { token: resetToken, password: newPassword });
};

// Refresh token
export const refreshToken = async (deviceId?: string, ip?: string, userAgent?: string) => {
  const headers: Record<string, string> = {};
  if (deviceId) headers['Device-Id'] = deviceId;
  if (ip) headers['X-Forwarded-For'] = ip;
  if (userAgent) headers['User-Agent'] = userAgent;

  const res = await axiosInstance.post('/auth/refresh-token', {}, { headers });
  console.log('Refresh token response:', res.data.result);
  return {
    token: res.data.result.token,
    refreshToken: res.data.result.refreshToken
  };
};

// Introspect token
export const introspectToken = async (token: string) => {
  const res = await axiosInstance.post(
    '/auth/introspect',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  console.log('Introspect token response:', res.data.result.valid);
  return res.data.result.valid; // Ensure this returns { valid: true/false }
};

async function handleLoginSuccess(token: string, refreshToken: string) {
  await useTokenStore.getState().setTokens(token, refreshToken);

  const payload = decodeToken(token);
  if (payload?.userId) {
    const userRes = await axiosInstance.get(`/users/${payload.userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    useUserStore.getState().setUser(userRes.data.result);
    useUserStore.getState().setAuthenticated(true);
  }
}
