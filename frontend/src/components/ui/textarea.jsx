// src/components/ui/textarea.jsx
// Primitif shadcn baru (belum ada sebelumnya) - pola & class PERSIS ngikutin
// input.jsx (border-border bg-secondary, focus ring sama), cuma element-nya
// textarea. Dipakai pertama kali di SupplierFormModal (field Alamat/Catatan).
import { cn } from '../../lib/utils';

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'flex min-h-[70px] w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };