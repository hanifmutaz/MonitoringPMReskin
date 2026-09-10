// src/contexts/ThemeContext.jsx
// -----------------------------------------------------------------------------
// Theme (dark/light) — polanya SAMA persis kayak SidebarContext/AuthContext lu:
// Provider + custom hook. Default IKUT OS (prefers-color-scheme), tapi kalau user
// pernah milih manual, pilihan manual menang & dipersist di localStorage.
//
// Cara kerja: nge-set atribut  <html data-theme="dark|light">.
// tokens.css yang baca atribut itu buat nentuin nilai semantic token.
// Anti-FOUC: ada <script> kecil di index.html yang nge-set data-theme SEBELUM
// React mount (lihat catatan integrasi). Provider ini nge-sinkronin state React
// dengan nilai yang udah keburu ke-set itu.
// -----------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'pm-theme'; // 'dark' | 'light' | (absen = ikut OS)
const ThemeContext = createContext(null);

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Resolusi awal: manual (localStorage) menang; kalau nggak ada, ikut OS.
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (_) { /* localStorage bisa keblok di beberapa lingkungan; abaikan */ }
  return getSystemTheme();
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  // isManual = user udah pernah override; kalau false, kita terus ngikutin OS.
  const [isManual, setIsManual] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) != null; } catch (_) { return false; }
  });

  // Terapkan ke <html> tiap theme berubah.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Kalau BELUM manual, ikutin perubahan tema OS secara live (mis. auto dark malam).
  useEffect(() => {
    if (isManual) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setThemeState(getSystemTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [isManual]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    setIsManual(true);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) { /* noop */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  // Balik ikut OS (hapus override manual) — opsional, buat menu "System".
  const useSystemTheme = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* noop */ }
    setIsManual(false);
    setThemeState(getSystemTheme());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isManual, setTheme, toggleTheme, useSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme harus dipakai di dalam <ThemeProvider>');
  return ctx;
}
