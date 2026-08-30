// src/components/masterdata/linesColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 9). Extracted from the
// hand-rolled <table> in LinesTab.jsx (batch 1/N "lock the pattern"),
// following the buildPmLineColumns.jsx (Phase 8) / pmPartColumns.jsx
// (Phase 7) precedent: a builder function, not a static array, since the
// Status toggle and Aksi buttons need onToggleActive/onEdit/onDelete
// callbacks from the page's component state.
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

function buildLinesColumns({ onToggleActive, onEdit, onDelete }) {
  return [
    {
      key: 'line_name',
      header: 'Nama Line',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.line_name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (line) => (
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={line.is_active}
            onChange={(e) => onToggleActive(line, e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          {line.is_active ? 'Aktif' : 'Nonaktif'}
        </label>
      ),
    },
    {
      key: 'auto_reset',
      header: 'Auto-Reset Override',
      className: 'text-xs text-[var(--text-dim)]',
      render: (line) =>
        line.auto_reset_weekly_on_monthly === null
          ? 'Ikut Global'
          : line.auto_reset_weekly_on_monthly
            ? 'TRUE'
            : 'FALSE',
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (line) => (
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(line)} aria-label={`Edit ${line.line_name}`}>
            <Pencil size={13} />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onDelete(line)} aria-label={`Hapus ${line.line_name}`}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];
}

export default buildLinesColumns;
