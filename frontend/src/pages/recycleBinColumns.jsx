// src/pages/recycleBinColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 11). Extracted from the
// hand-rolled <table> in RecycleBinPage.jsx - same 5 columns, following
// the pmLineHistoryColumns.jsx/userManagementColumns.jsx precedent
// (co-located in pages/, single consumer, no domain folder case).
import { RotateCcw, Flame } from 'lucide-react';
import { Button } from '../components/ui/button';

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
      render: (item) => new Date(item.deleted_at).toLocaleString('id-ID'),
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7"
            onClick={() => onRestore(item)}
            disabled={restorePending}
            title="Restore"
          >
            <RotateCcw size={13} /> Restore
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPermanentDelete(item)}
            disabled={deletePending}
            title="Hapus Permanen"
          >
            <Flame size={13} />
          </Button>
        </div>
      ),
    },
  ];
}

export default buildRecycleBinColumns;
