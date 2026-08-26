// src/components/masterdata/suppliersColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 9). Extracted from the
// hand-rolled <table> in SuppliersTab.jsx - same 6 columns (5 data +
// actions), following the linesColumns.jsx precedent (this tab was itself
// built to follow LinesTab's pattern, "batch 2/N - ngikutin pattern
// LinesTab").
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

function buildSuppliersColumns({ onEdit, onDelete, onToggleActive }) {
  return [
    {
      key: 'supplier_name',
      header: 'Nama Supplier',
      render: (s) => <span className="font-[var(--font-mono)] text-[13px]">{s.supplier_name}</span>,
    },
    {
      key: 'contact_person',
      header: 'Kontak',
      className: 'text-xs text-[var(--text-dim)]',
      render: (s) => s.contact_person || '-',
    },
    {
      key: 'phone',
      header: 'Telepon',
      render: (s) => <span className="font-[var(--font-mono)] text-[13px]">{s.phone || '-'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      className: 'text-xs text-[var(--text-dim)]',
      render: (s) => s.email || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={s.is_active}
            onChange={(e) => onToggleActive(s, e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          {s.is_active ? 'Aktif' : 'Nonaktif'}
        </label>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (s) => (
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(s)}>
            <Pencil size={13} />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onDelete(s)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];
}

export default buildSuppliersColumns;
