// src/components/ui/dialog.jsx
//
// polish: A2/D1 (rounded-xl) - panel dialog naik dari rounded-lg biar 1
// bahasa radius sama Card/DataTable. Lihat docs/frontend/UI-CONSISTENCY-AUDIT.md A2.
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        // polish: A10 (motion, 08 Sep 2026) - backdrop fade pakai token
        // duration-[var(--duration-slow)] + easing beda buat masuk (decelerate) vs
        // keluar
        // (accelerate), sesuai LOCK di UI-CONSISTENCY-AUDIT.md §6 ("Modal/
        // Drawer: backdrop fade + panel slide/scale, slow. Exit accelerate").
        // Sebelumnya nggak ada duration/easing eksplisit di overlay (ikut
        // default tw-animate-css).
        'fixed inset-0 z-50 bg-black/50 duration-[var(--duration-slow)] data-[state=open]:animate-in data-[state=open]:ease-decelerate data-[state=closed]:animate-out data-[state=closed]:ease-accelerate data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          // polish: A10 (motion, 08 Sep 2026) - `duration-200` mentah
          // diganti `duration-[var(--duration-slow)]` (300ms, LOCK §6), easing dibedain
          // enter (decelerate) vs exit (accelerate) - sebelumnya sama-sama
          // pakai easing default (nggak eksplisit).
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-card p-6 shadow-lg duration-[var(--duration-slow)] data-[state=open]:animate-in data-[state=open]:ease-decelerate data-[state=closed]:animate-out data-[state=closed]:ease-accelerate data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-xl max-h-[85vh] overflow-y-auto',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-text-faint opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Tutup</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1.5 mb-2', className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold leading-none text-foreground font-display', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose };
