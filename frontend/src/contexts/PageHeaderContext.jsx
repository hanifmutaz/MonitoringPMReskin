// src/contexts/PageHeaderContext.jsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const PageHeaderContext = createContext(null);

export function PageHeaderProvider({ children }) {
  const [header, setHeader] = useState({ title: '', actions: null });
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeader harus dipakai di dalam <PageHeaderProvider>');
  return ctx;
}

/** Dipanggil oleh tiap halaman: usePageHeader({ title: 'Dashboard' }) */
export function usePageHeader({ title, actions = null }) {
  const { setHeader } = usePageHeaderContext();
  useEffect(() => {
    setHeader({ title, actions });
  }, [title, actions, setHeader]);
}

/** Dipakai oleh <Topbar> buat baca judul halaman aktif saat ini. */
export function useCurrentPageHeader() {
  return usePageHeaderContext().header;
}
