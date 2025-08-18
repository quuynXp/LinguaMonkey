import {jwtDecode} from 'jwt-decode';

interface TokenPayload {
  userId: string;
  sub: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};
