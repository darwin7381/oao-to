import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log('[useAuth] Checking auth, token exists:', !!token);
    
    if (!token) {
      console.log('[useAuth] No token found');
      setLoading(false);
      return;
    }

    try {
      console.log('[useAuth] Fetching user info...');
      const userData = await api.getMe();
      console.log('[useAuth] User data received:', userData);
      setUser(userData);
    } catch (error) {
      console.error('[useAuth] Failed to get user:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    const apiBase = import.meta.env.PROD 
      ? 'https://api.oao.to' 
      : 'http://localhost:8788';
    console.log('[useAuth] Redirecting to login:', `${apiBase}/api/auth/google`);
    window.location.href = `${apiBase}/api/auth/google`;
  };

  const logout = () => {
    console.log('[useAuth] Logging out');
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/';
  };

  return { user, loading, login, logout, refreshAuth: checkAuth };
}

