import axios from "axios";
import { EXPO_PUBLIC_API_BASE_URL } from "react-native-dotenv";

const API_BASE_URL = EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;

// KHÔNG import axiosInstance ở đây!
export async function refreshTokenApi(refreshToken: string) {
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
    return res.data;
  } catch (err) {
    console.error("[refreshTokenApi] error", err);
    throw err;
  }
}

export async function introspectToken(token: string) {
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/introspect`, { token });
    return res.data?.active || false;
  } catch (err) {
    console.error("[introspectToken] error", err);
    return false;
  }
}
