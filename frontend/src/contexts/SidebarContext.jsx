// src/contexts/SidebarContext.jsx
//
// State `collapsed` sidebar dipindah ke sini (dari lokal di Sidebar.jsx) -
// alasannya: tombol toggle-nya sekarang dipindah ke Topbar (feedback via
// chat + referensi Mantis, hamburger-nya emang di topbar bukan di sidebar),
// jadi Sidebar & Topbar butuh baca/ubah state yang sama. Persist ke
// localStorage tetap di sini (logic-nya sama kayak sebelumnya, cuma
// pindah rumah).
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'pm-monitor:sidebar-collapsed';

// Breakpoint sama persis dengan Tailwind `lg:` (64rem = 1024px). Di bawah ini
// (iPad portrait 810px, HP) sidebar jadi drawer off-canvas; di atasnya tetap
// sidebar sticky + mode icon-only seperti sebelumnya.
const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeDesktop(callback) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const [collapsedPref, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsedPref ? '1' : '0');
    } catch {
      // localStorage gak available (mode private/dll) - collapse tetap
      // jalan, cuma gak persist antar reload. Bukan error yang perlu ditangani.
    }
  }, [collapsedPref]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Esc nutup drawer (iPad + keyboard).
  useEffect(() => {
    if (isDesktop || !mobileOpen) return undefined;
    const onKeyDown = (e) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDesktop, mobileOpen]);

  // `collapsed` = mode icon-only, HANYA berlaku di desktop. Di layar sempit
  // drawer selalu tampil penuh (label kebaca) - preferensi collapsed yang
  // tersimpan di localStorage tetap utuh, cuma gak dipakai di sana.
  // `drawerOpen` selalu false di desktop (drawer gak ada di sana).
  const collapsed = isDesktop && collapsedPref;
  const drawerOpen = !isDesktop && mobileOpen;

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      isDesktop,
      drawerOpen,
      closeMobile,
      // Satu tombol di Topbar: desktop = collapse/expand, layar sempit =
      // buka/tutup drawer.
      toggleCollapsed: () => (isDesktop ? setCollapsed((v) => !v) : setMobileOpen((v) => !v)),
    }),
    [collapsed, isDesktop, drawerOpen, closeMobile]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar harus dipakai di dalam <SidebarProvider>');
  return ctx;
}