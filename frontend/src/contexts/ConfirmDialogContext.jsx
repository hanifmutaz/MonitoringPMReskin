// src/contexts/ConfirmDialogContext.jsx
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';

const ConfirmDialogContext = createContext(null);

// Pengganti window.confirm() bawaan browser (yang tampilannya gak bisa
// di-styling sama sekali, beda-beda tiap browser/OS) - API-nya SENGAJA
// dibikin mirip: `if (!(await confirm('Hapus X?'))) return;` di dalam
// function async, cuma nambah `await` doang dari kode lama yang pakai
// `if (!confirm('Hapus X?')) return;`.
//
// 1 dialog DIRENDER SEKALI di root (lihat main.jsx), dipakai gantian buat
// semua konfirmasi di seluruh app - bukan 1 AlertDialog per tempat yang
// butuh konfirmasi (itu boros, gak perlu).
export function ConfirmDialogProvider({ children }) {
  const [state, setState] = useState({ open: false, message: '', title: 'Konfirmasi', destructive: true });
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        message,
        title: options.title || 'Konfirmasi',
        destructive: options.destructive ?? true,
      });
    });
  }, []);

  function resolveAndClose(result) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState((s) => ({ ...s, open: false }));
  }

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(open) => !open && resolveAndClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            <AlertDialogDescription>{state.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolveAndClose(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resolveAndClose(true)}
              className={state.destructive ? 'bg-destructive text-destructive-foreground hover:opacity-90' : ''}
            >
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm() harus dipanggil di dalam <ConfirmDialogProvider>');
  }
  return ctx;
}
