// src/contexts/SidebarContext.jsx
//
// State `collapsed` sidebar dipindah ke sini (dari lokal di Sidebar.jsx) -
// alasannya: tombol toggle-nya sekarang dipindah ke Topbar (feedback via
// chat + referensi Mantis, hamburger-nya emang di topbar bukan di sidebar),
// jadi Sidebar & Topbar butuh baca/ubah state yang sama. Persist ke
// localStorage tetap di sini (logic-nya sama kayak sebelumnya, cuma
// pindah rumah).
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'pm-monitor:sidebar-collapsed';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // localStorage gak available (mode private/dll) - collapse tetap
      // jalan, cuma gak persist antar reload. Bukan error yang perlu ditangani.
    }
  }, [collapsed]);

  const value = useMemo(
    () => ({ collapsed, setCollapsed, toggleCollapsed: () => setCollapsed((v) => !v) }),
    [collapsed]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar harus dipakai di dalam <SidebarProvider>');
  return ctx;
}