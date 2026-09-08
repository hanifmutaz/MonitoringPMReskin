// src/pages/recycleBinColumns.jsx
// Fase 1 (A1/D3): kolom "Dihapus Pada" pakai formatDateTime().
import { RotateCcw, Flame } from 'lucide-react';
import { Button } from '../components/ui/button';
import { formatDateTime } from '../utils/formatDate';

function buildRecycleBinColumns({ onRestore, onPermanentDelete, restorePending, deletePending }) {
  return [
    {
      key: 'label',
      header: 'Data',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.label}</span>,
    },
    {
      key: 'context',
      header: 'Konteks',
      className: 'text-xs text-[var(--text-dim)]',
      render: (item) => item.context || '-',
    },
    {
      key: 'deleted_at',
      header: 'Dihapus Pada',
      className: 'font-[var(--font-mono)] text-xs text-[var(--text-dim)]',
      render: (item) => formatDateTime(item.deleted_at),
    },
    {
      key: 'deleted_by_name',
      header: 'Dihapus Oleh',
      className: 'text-xs text-[var(--text-dim)]',
      render: (item) => item.deleted_by_name || '-',
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item) => (
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => onRestore(item)} disabled={restorePending} title="Restore">
            <RotateCcw size={13} /> Restore
          </Button>
          <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => onPermanentDelete(item)} disabled={deletePending} title="Hapus Permanen">
            <Flame size={13} />
          </Button>
        </div>
      ),
    },
  ];
}

export default buildRecycleBinColumns;
