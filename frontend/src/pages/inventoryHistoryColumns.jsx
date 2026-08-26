// src/pages/inventoryHistoryColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 10). Extracted from the
// hand-rolled <table> in InventoryHistoryPage.jsx - same 6 columns,
// following the pm-line/pm-part/masterdata columns-file precedent.
// MOVEMENT_TYPE_LABEL/MOVEMENT_TYPE_BADGE_CLASS exported alongside since
// the page's own <Select> filter needs MOVEMENT_TYPE_LABEL too (same
// pattern as pmLineHistoryColumns.jsx exporting JENIS_LABEL).
const MOVEMENT_TYPE_LABEL = {
  STOCK_IN: 'Stock In',
  STOCK_OUT: 'Stock Out',
  ADJUSTMENT: 'Adjustment',
};

const MOVEMENT_TYPE_BADGE_CLASS = {
  STOCK_IN: 'bg-ok-dim text-ok',
  STOCK_OUT: 'bg-danger-dim text-danger',
  ADJUSTMENT: 'bg-warn-dim text-warn',
};

const inventoryHistoryColumns = [
  {
    key: 'created_at',
    header: 'Tanggal',
    className: 'font-[var(--font-mono)] text-xs text-[var(--text-dim)]',
    render: (m) => new Date(m.created_at).toLocaleString('id-ID'),
  },
  {
    key: 'item',
    header: 'Item',
    render: (m) => (
      <>
        <div className="font-[var(--font-mono)] text-[13px]">{m.part_name}</div>
        <div className="text-xs text-[var(--text-dim)]">{m.spare_part_number}</div>
      </>
    ),
  },
  {
    key: 'movement_type',
    header: 'Jenis',
    render: (m) => (
      <span
        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
          MOVEMENT_TYPE_BADGE_CLASS[m.movement_type] || 'bg-[var(--panel-3)] text-[var(--text-faint)]'
        }`}
      >
        {MOVEMENT_TYPE_LABEL[m.movement_type] || m.movement_type}
      </span>
    ),
  },
  {
    key: 'qty',
    header: 'Qty',
    render: (m) => (
      <span className="font-[var(--font-mono)] text-[13px]">
        {m.movement_type === 'STOCK_OUT' ? '-' : '+'}
        {Number(m.qty).toLocaleString('id-ID')}
      </span>
    ),
  },
  {
    key: 'note',
    header: 'Catatan',
    className: 'max-w-[240px] text-xs text-[var(--text-dim)]',
    render: (m) => m.note || '-',
  },
  {
    key: 'user_full_name',
    header: 'Oleh',
    className: 'text-xs text-[var(--text-dim)]',
    render: (m) => m.user_full_name,
  },
];

export { MOVEMENT_TYPE_LABEL };
export default inventoryHistoryColumns;
