import { auth } from '../../firebaseConfig';


import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import {
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_FACEBOOK_APP_ID,
} from '@env';

// 🔹 Google Login (giữ nguyên code của bạn)
export async function loginWithGoogleFirebase(): Promise<string> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token id_token` +
      `&scope=openid profile email`;

    const result = await AuthSession.startAsync({ authUrl });

    if (result.type === 'success' && result.params.id_token) {
      const { id_token, access_token } = result.params;
      const credential = GoogleAuthProvider.credential(id_token, access_token);
      const userCredential = await signInWithCredential(auth, credential);
      return await userCredential.user.getIdToken();
    } else {
      throw new Error('Google sign-in cancelled');
    }
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
}

// 🔹 Facebook Login với expo-auth-session
export async function loginWithFacebookFirebase(): Promise<string> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

    const authUrl =
      `https://www.facebook.com/v12.0/dialog/oauth` +
      `?client_id=${EXPO_PUBLIC_FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=email,public_profile`;

    const result = await AuthSession.startAsync({ authUrl });

    if (result.type === 'success' && result.params.access_token) {
      const { access_token } = result.params;
      const credential = FacebookAuthProvider.credential(access_token);
      const userCredential = await signInWithCredential(auth, credential);
      return await userCredential.user.getIdToken();
    } else {
      throw new Error('Facebook sign-in cancelled');
    }
  } catch (error) {
    console.error('Facebook login error:', error);
    throw error;
  }
}
