// src/components/BulkDeleteBar.jsx
// Bar "N dipilih -> Hapus Terpilih" - muncul di atas tabel begitu ada
// row yang di-checklist. Generik, dipakai di semua tabel Master Data yang
// punya bulk-delete (Lines/Parts/Suppliers/Inventory/Roles/dst).
import { Trash2, X } from 'lucide-react';
import { Button } from './ui/button';

function BulkDeleteBar({ count, onDelete, onClear, pending, label = 'data' }) {
  if (count === 0) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--accent-dim)] bg-[var(--accent-dim)] px-3 py-2">
      <span className="text-[13px] font-medium text-primary">
        {count} {label} dipilih
      </span>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7" onClick={onClear} disabled={pending}>
          <X size={13} /> Batal
        </Button>
        <Button type="button" variant="destructive" size="sm" className="h-7" onClick={onDelete} disabled={pending}>
          <Trash2 size={13} /> {pending ? 'Menghapus...' : 'Hapus Terpilih'}
        </Button>
      </div>
    </div>
  );
}

export default BulkDeleteBar;