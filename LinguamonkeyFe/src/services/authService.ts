// auth.ts
import axiosInstance from '../api/axiosInstance';
import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';
import { decodeToken, getRoleFromToken } from '../utils/decodeToken';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToTab, resetToAuth, RootNavigationRef } from "../utils/navigationRef";
import { loginWithGoogleFirebase, loginWithFacebookFirebase } from './firebaseService';
import { use } from 'react';


// ----- EMAIL LOGIN -----
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const res = await axiosInstance.post('/auth/login', { email, password });
    if (res.data.result.authenticated) {
      await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
      return true;
    }
  } catch (error) {
    console.error('Email login error:', error);
  }
  return false;
};

// ----- GOOGLE LOGIN -----
export async function loginWithGoogle() {
  const idToken = await loginWithGoogleFirebase();
  const res = await axiosInstance.post('/auth/firebase-login', {}, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
  return true;
}

// ----- FACEBOOK LOGIN -----
export async function loginWithFacebook() {
  const idToken = await loginWithFacebookFirebase();
  const res = await axiosInstance.post('/auth/firebase-login', {}, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  await handleLoginSuccess(res.data.result.token, res.data.result.refreshToken);
  return true;
}

// ----- LOGOUT -----
export const logout = async () => {
  try {
    await axiosInstance.post('/auth/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    await useTokenStore.getState().clearTokens();
    useUserStore.getState().setUser(null);
    useUserStore.getState().setAuthenticated(false);
    resetToAuth('Login');
  }
};

// ----- HANDLE LOGIN SUCCESS -----
async function handleLoginSuccess(token: string, refreshToken: string) {
  try {
    await useTokenStore.getState().setTokens(token, refreshToken);
    console.log('Login response:', { token, refreshToken });
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const payload = decodeToken(token);
    if (!payload?.userId) return;

    useUserStore.getState().setUserId(payload.userId);
    const userRes = await axiosInstance.get(`/users/${payload.userId}`);
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

    // Only navigate if RootNavigation hasn't already set the route
    const currentRoute = RootNavigationRef.current?.getCurrentRoute()?.name;
    if (!currentRoute || currentRoute === 'Auth') {
      if (normalizedUser.roles.includes('ROLE_ADMIN')) {
        resetToTab('Admin');
      } else if (normalizedUser.roles.includes('ROLE_TEACHER')) {
        resetToTab('Teacher');
      } else {
        const currentDate = new Date().toLocaleDateString('en-CA');
        const lastAppOpenDate = await AsyncStorage.getItem('lastAppOpenDate');
        const isFirstOpenToday = lastAppOpenDate !== currentDate;
        resetToTab(isFirstOpenToday ? 'DailyWelcome' : 'Home');
      }
    }
  } catch (e) {
    console.error('handleLoginSuccess error:', e);
    resetToAuth('Login');
  }
}


// Register with email
export const registerWithEmail = async (firstName: string, lastName: string, email: string, password: string) => {
  const fullname = `${firstName} ${lastName}`;
  await axiosInstance.post('/users', { fullname, email, password });
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
export const refreshToken = async (refreshToken: string, deviceId?: string, ip?: string, userAgent?: string) => {
  const headers: Record<string, string> = {};
  if (deviceId) headers['Device-Id'] = deviceId;
  if (ip) headers['X-Forwarded-For'] = ip;
  if (userAgent) headers['User-Agent'] = userAgent;

  const res = await axiosInstance.post(
    '/auth/refresh-token',
    { refreshToken }, 
    { headers }
  );

  return {
    token: res.data.result.token,
    refreshToken: res.data.result.refreshToken
  };
};


// Introspect token
export const introspectToken = async (token: string) => {
  try {
    const res = await axiosInstance.post(
      '/auth/introspect',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.result.valid;
  } catch (e) {
    console.warn('Introspect token error:', e);
    return false;
  }
};