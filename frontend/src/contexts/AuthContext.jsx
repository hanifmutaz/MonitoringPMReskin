// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cek sesi yang sedang aktif (cookie httpOnly) saat app pertama kali load.
  // Ini menggantikan pola "baca token dari localStorage" karena token
  // sengaja tidak bisa diakses JavaScript sama sekali.
  useEffect(() => {
    authApi
      .fetchMe()
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const { user: loggedInUser } = await authApi.login(username, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    // Admin selalu ['*'] dari backend (lihat authService.getMe/login) - cek
    // includes('*') dulu sebelum cek permission spesifik, sama pola dengan
    // permissionMiddleware.js di backend. Ini cuma buat UX (sembunyiin
    // menu/route), backend tetap penegak utama lewat requirePermission().
    hasPermission: (key) => {
      const permissions = user?.permissions || [];
      return permissions.includes('*') || permissions.includes(key);
    },
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
