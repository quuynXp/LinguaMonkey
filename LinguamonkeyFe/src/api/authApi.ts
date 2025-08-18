import axios from 'axios';
import { EXPO_PUBLIC_API_BASE_URL } from '@env';

const rawAxios = axios.create({ baseURL: EXPO_PUBLIC_API_BASE_URL });

export const introspectToken = async (token: string) => {
  const res = await rawAxios.post('/auth/introspect', {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.result.valid;
};

export const refreshToken = async (refreshToken: string) => {
  const res = await rawAxios.post('/auth/refresh-token', {}, {
    headers: { Authorization: `Bearer ${refreshToken}` }
  });
  return {
    token: res.data.result.token,
    refreshToken: res.data.result.refreshToken
  };
};
