import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

export async function refreshTokenApi(refreshToken: string) {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh-token`, { refreshToken });
    return res.data;
  } catch (err) {
    console.error("[refreshTokenApi] error", err);
    throw err;
  }
}

export async function introspectToken(token: string) {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/v1/auth/introspect`, { token });
    return res.data?.active || false;
  } catch (err) {
    console.error("[introspectToken] error", err);
    return false;
  }
}
