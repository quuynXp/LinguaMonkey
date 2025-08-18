import React, { createContext, ReactNode, useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { setAccessToken } from '../stores/tokenStore';

interface AuthContextProps {
  isAuthenticated: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextProps>({
  isAuthenticated: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axiosInstance.post('/auth/refresh-token', {}, { withCredentials: true });
        if (res.data?.accessToken) {
          setAccessToken(res.data.accessToken);
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
