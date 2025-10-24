// firebaseService.ts
import { auth } from '../../firebaseConfig';
import { GoogleAuthProvider, FacebookAuthProvider, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';


const EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const EXPO_PUBLIC_FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

// --- GOOGLE LOGIN ---
export async function loginWithGoogleFirebase(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      });

      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.id_token) {
        return reject(new Error('Google login cancelled or failed'));
      }

      const credential = GoogleAuthProvider.credential(result.params.id_token);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseIdToken = await userCredential.user.getIdToken();
      resolve(firebaseIdToken);
    } catch (err) {
      reject(err);
    }
  });
}

// --- FACEBOOK LOGIN ---
export async function loginWithFacebookFirebase(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const [request, response, promptAsync] = Facebook.useAuthRequest({
        clientId: EXPO_PUBLIC_FACEBOOK_APP_ID,
      });

      const result = await promptAsync();
      if (result.type !== 'success' || !result.params.access_token) {
        return reject(new Error('Facebook login cancelled or failed'));
      }

      const credential = FacebookAuthProvider.credential(result.params.access_token);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseIdToken = await userCredential.user.getIdToken();
      resolve(firebaseIdToken);
    } catch (err) {
      reject(err);
    }
  });
}
