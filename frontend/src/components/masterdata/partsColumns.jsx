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

// 'YYYY-MM-DD' (string dari API, sengaja tanpa parse Date biar tidak geser timezone) -> 'DD/MM/YYYY'.
function formatTglPasang(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : null;
}

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
      key: 'tgl_pasang_awal',
      header: 'Tgl Pasang Awal',
      render: (part) => {
        const tgl = formatTglPasang(part.tgl_pasang_awal);
        return tgl ? (
          <span className="font-[var(--font-mono)] text-[13px]">{tgl}</span>
        ) : (
          <span
            className="text-xs text-[var(--text-faint)]"
            title="Belum diisi. Opsional untuk Part yang sudah punya riwayat penggantian, tapi Part yang belum pernah diganti butuh ini supaya Counter/Sisa Shot terhitung."
          >
            Belum diisi
          </span>
        );
      },
    },
    {
      key: 'counter_awal',
      header: 'Counter Awal',
      align: 'right',
      render: (part) => {
        const tgl = formatTglPasang(part.counter_awal_tanggal);
        if (part.counter_awal == null || !tgl) {
          return <span className="text-xs text-[var(--text-faint)]">-</span>;
        }
        return (
          <>
            <div className="font-[var(--font-mono)] text-[13px]">{Number(part.counter_awal).toLocaleString('id-ID')}</div>
            <div className="text-[10px] text-[var(--text-faint)]">per {tgl}</div>
          </>
        );
      },
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
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(part)} aria-label={`Edit ${part.drawing_no}`}>
            <Pencil size={13} />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onDelete(part)} aria-label={`Hapus ${part.drawing_no}`}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];
}

export default buildPartsColumns;
