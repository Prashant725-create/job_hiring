// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth';
import { setFetchAuthToken } from '../api/fetchWithAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(false);

  // put token into fetchWithAuth helper
  useEffect(() => { setFetchAuthToken(accessToken); }, [accessToken]);

  async function login(email, password) {
    setLoading(true);
    try {
      const { accessToken: token, user: u } = await authApi.login(email, password);
      setAccessToken(token);
      setUser(u);
      localStorage.setItem('accessToken', token);
      localStorage.setItem('user', JSON.stringify(u));
      setFetchAuthToken(token);
      return u;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch (e) { /* ignore */ }
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setFetchAuthToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
