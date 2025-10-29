import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import instance from '../api/axiosInstance';
import { useTokenStore } from '../stores/tokenStore';
import { useUserStore } from '../stores/UserStore';

const EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const EXPO_PUBLIC_FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

/**
 * --- GOOGLE LOGIN + SET USER ---
 */
export async function loginWithGoogle(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      });

      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.id_token) {
        return reject(new Error('Google login cancelled or failed'));
      }

      // Gửi token về backend để verify, backend trả JWT + user info
      const res = await instance.post('/auth/google', { token: result.params.id_token });

      const { jwt, refreshToken, user } = res.data;

      // Lưu token vào store
      useTokenStore.getState().setTokens(jwt, refreshToken);

      // Lưu thông tin user vào store
      useUserStore.getState().setUser(user);
      useUserStore.getState().setAuthenticated(true);

      resolve();
    } catch (err: any) {
      reject(err?.response?.data?.message || err.message || 'Google login failed');
    }
  });
}

/**
 * --- FACEBOOK LOGIN + SET USER ---
 */
export async function loginWithFacebook(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const [request, response, promptAsync] = Facebook.useAuthRequest({
        clientId: EXPO_PUBLIC_FACEBOOK_APP_ID,
      });

      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.access_token) {
        return reject(new Error('Facebook login cancelled or failed'));
      }

      // Gửi token về backend để verify, backend trả JWT + user info
      const res = await instance.post('/auth/facebook', { token: result.params.access_token });

      const { jwt, refreshToken, user } = res.data;

      // Lưu token vào store
      useTokenStore.getState().setTokens(jwt, refreshToken);

      // Lưu thông tin user vào store
      useUserStore.getState().setUser(user);
      useUserStore.getState().setAuthenticated(true);

      resolve();
    } catch (err: any) {
      reject(err?.response?.data?.message || err.message || 'Facebook login failed');
    }
  });
}

/**
 * --- PHONE LOGIN (OTP) + SET USER ---
 */
export async function sendOtp(phoneNumber: string): Promise<string> {
  try {
    const res = await instance.post('/auth/phone/send-otp', { phone: phoneNumber });
    return res.data.otpSid;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Send OTP failed');
  }
}

export async function verifyOtp(otpSid: string, code: string): Promise<void> {
  try {
    const res = await instance.post('/auth/phone/verify-otp', { otpSid, code });

    const { jwt, refreshToken, user } = res.data;

    useTokenStore.getState().setTokens(jwt, refreshToken);
    useUserStore.getState().setUser(user);
    useUserStore.getState().setAuthenticated(true);
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Verify OTP failed');
  }
}
