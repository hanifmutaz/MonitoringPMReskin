// src/components/masterdata/inventoryColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 9). Extracted from the two
// hand-rolled <table>s in InventoryTab.jsx - main item list (7 cols,
// buildInventoryColumns) and the movement-history table inside
// ItemDetailModal (5 cols, inventoryMovementColumns). Following the
// pmLineColumns.jsx/partsColumns.jsx precedent.
//
// RopBadge was a local component in InventoryTab.jsx - moved here since
// it's only ever used inside these columns (the item list's Status column
// and ItemDetailModal's ROP summary card), same reasoning as
// StatusWithKetepatan in pm-line/pmLineColumns.jsx.
import { ArrowDownCircle, ArrowUpCircle, History, Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

function RopBadge({ rop }) {
  if (!rop || rop.status === 'NOT_CONFIGURED') {
    return <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-warn-dim text-warn">Belum lengkap</span>;
  }
  if (rop.status === 'ORDER') {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-danger-dim text-danger">
        <ShoppingCart size={11} /> Order ({rop.order_qty})
      </span>
    );
  }
  return <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-ok-dim text-ok">OK</span>;
}

function buildInventoryColumns({ ropById, onDetail, onEdit, onDelete }) {
  return [
    {
      key: 'item',
      header: 'Spare Part Number / Nama',
      render: (item) => (
        <>
          <div className="font-[var(--font-mono)] text-[13px]">{item.spare_part_number}</div>
          <div className="text-xs text-[var(--text-dim)]">{item.part_name}</div>
        </>
      ),
    },
    {
      key: 'location',
      header: 'Lokasi',
      className: 'text-xs text-[var(--text-dim)]',
      render: (item) => item.location || '-',
    },
    {
      key: 'stock',
      header: 'Stok',
      align: 'right',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.current_stock.toLocaleString('id-ID')}</span>,
    },
    {
      key: 'rop',
      header: 'ROP',
      align: 'right',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{ropById.get(item.id)?.rop ?? '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <RopBadge rop={ropById.get(item.id)} />,
    },
    {
      key: 'linked_part_count',
      header: 'Dipakai Part',
      align: 'center',
      render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.linked_part_count}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item) => (
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" title="Detail & Mutasi Stok" onClick={() => onDetail(item)}>
            <History size={13} />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
            <Pencil size={13} />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onDelete(item)}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];
}

const inventoryMovementColumns = [
  {
    key: 'created_at',
    header: 'Tanggal',
    className: 'font-[var(--font-mono)] text-xs text-[var(--text-dim)]',
    render: (m) => new Date(m.created_at).toLocaleString('id-ID'),
  },
  {
    key: 'movement_type',
    header: 'Jenis',
    render: (m) =>
      m.movement_type === 'STOCK_OUT' ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
          <ArrowDownCircle size={12} /> Stock Out
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
          <ArrowUpCircle size={12} /> {m.movement_type === 'ADJUSTMENT' ? 'Adjustment' : 'Stock In'}
        </span>
      ),
  },
  {
    key: 'qty',
    header: 'Qty',
    render: (m) => <span className="font-[var(--font-mono)] text-[13px]">{m.qty.toLocaleString('id-ID')}</span>,
  },
  {
    key: 'note',
    header: 'Catatan',
    className: 'text-xs text-[var(--text-dim)]',
    render: (m) => m.note || '-',
  },
  {
    key: 'user_full_name',
    header: 'Oleh',
    className: 'text-xs text-[var(--text-dim)]',
    render: (m) => m.user_full_name,
  },
];

export { RopBadge, buildInventoryColumns, inventoryMovementColumns };
