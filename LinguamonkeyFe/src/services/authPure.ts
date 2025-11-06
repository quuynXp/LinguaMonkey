import { refreshClient } from '../api/refreshClient';

export async function refreshTokenPure(refreshToken: string) {
  if (!refreshToken?.trim()) {
    throw new Error('Missing refreshToken');
  }

  const res = await refreshClient.post('/api/v1/auth/refresh-token', { refreshToken });
  const result = res.data?.result || {};
  if (!result.token || !result.refreshToken) {
    throw new Error('Invalid refresh response');
  }
  return result;
}
