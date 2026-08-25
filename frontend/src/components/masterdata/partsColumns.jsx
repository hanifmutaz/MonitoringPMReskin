// src/components/masterdata/partsColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 9, batch 3/N - PartsTab
// DataTable migration). Extracted from the hand-rolled <table> in
// PartsTab.jsx, following the linesColumns.jsx (batch 1/N) builder-function
// precedent - CL Mapping/Supplier/Edit/Delete actions need callbacks from
// the page's component state. Status badge kept as its original inline
// span (bg-ok-dim/panel-3), NOT swapped for data-display/StatusBadge - that
// component's OK/WARNING/DANGER semantics don't match this boolean
// Aktif/Nonaktif toggle, so forcing it would be a behaviour/meaning change,
// not a pure migration.
import { Link2, Truck, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

function buildPartsColumns({ onClMapping, onSupplier, onEdit, onDelete }) {
  return [
    {
      key: 'line',
      header: 'Line',
      render: (part) => <span className="font-[var(--font-mono)] text-[13px]">{part.line_name}</span>,
    },
    {
      key: 'jig',
      header: 'Jig',
      className: 'text-xs text-[var(--text-dim)]',
      render: (part) => part.jig_name,
    },
    {
      key: 'drawing_part',
      header: 'Drawing No / Part Name',
      render: (part) => (
        <>
          <div className="text-[13px]">{part.part_name}</div>
          <div className="font-[var(--font-mono)] text-xs text-[var(--text-dim)]">{part.drawing_no}</div>
          {part.inventory_item_id && (
            <div className="text-[10px] text-[var(--text-faint)]">
              Stok: {part.inv_spare_part_number} ({part.inv_current_stock})
            </div>
          )}
        </>
      ),
    },
    {
      key: 'target_shot',
      header: 'Target Shot',
      align: 'right',
      render: (part) => <span className="font-[var(--font-mono)] text-[13px]">{part.target_shot.toLocaleString('id-ID')}</span>,
    },
    {
      key: 'cl_count',
      header: 'CL',
      align: 'center',
      render: (part) => <span className="font-[var(--font-mono)] text-[13px]">{part.cl_count}</span>,
    },
    {
      key: 'supplier_count',
      header: 'Supplier',
      align: 'center',
      render: (part) => <span className="font-[var(--font-mono)] text-[13px]">{part.supplier_count}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (part) => (
        <span
          className={
            part.is_active
              ? 'rounded px-1.5 py-0.5 text-[11px] font-medium bg-ok-dim text-ok'
              : 'rounded px-1.5 py-0.5 text-[11px] font-medium bg-[var(--panel-3)] text-[var(--text-faint)]'
          }
        >
          {part.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (part) => (
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            title="CL Mapping"
            onClick={() => onClMapping(part)}
          >
            <Link2 size={13} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            title="Supplier"
            onClick={() => onSupplier(part)}
          >
            <Truck size={13} />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(part)}>
            <Pencil size={13} />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onDelete(part)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];
}

export default buildPartsColumns;
