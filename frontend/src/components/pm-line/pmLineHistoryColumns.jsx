// src/components/pm-line/pmLineHistoryColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 8). Extracted from the
// hand-rolled <table> in pages/PmLineHistoryPage.jsx - same 7 columns,
// same cell markup, following the buildPmPartColumns.jsx precedent from
// Phase 7. Static array, not a function - unlike pmLineColumns.jsx/
// pmPartColumns.jsx, no cell here needs a per-row callback (no action
// column). The checkbox column is NOT defined here - DataTable renders it
// itself when the page passes a `selection` prop (see DataTable.jsx's
// Phase 8 selection support), same as every other column set stays
// selection-agnostic in this app.
//
// OnTimeBadge stays imported from the flat components/ folder (NOT moved
// into pm-line/) - confirmed via grep it's also used by
// PmPartHistoryPage.jsx, so it's cross-domain shared, unlike
// PmLineHistoryForm.jsx which was single-domain and safe to move.
import OnTimeBadge from '../OnTimeBadge';

const JENIS_LABEL = { MONTHLY: 'Monthly', WEEKLY: 'Weekly' };

const pmLineHistoryColumns = [
  {
    key: 'tgl_input',
    header: 'Tanggal',
    render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.tgl_input}</span>,
  },
  {
    key: 'line',
    header: 'Line',
    render: (item) => <span className="font-[var(--font-mono)] text-[13px]">{item.line_name}</span>,
  },
  {
    key: 'jenis',
    header: 'Jenis',
    render: (item) => <span className="text-[13px]">{JENIS_LABEL[item.jenis_pm]}</span>,
  },
  {
    key: 'pic',
    header: 'PIC',
    render: (item) => <span className="text-[13px]">{item.pic_name || '-'}</span>,
  },
  {
    key: 'ketepatan',
    header: 'Ketepatan',
    render: (item) => <OnTimeBadge onTime={item.on_time} />,
  },
  {
    key: 'keterangan',
    header: 'Keterangan',
    className: 'max-w-[240px] text-xs text-[var(--text-dim)]',
    render: (item) => item.keterangan || '-',
  },
  {
    key: 'oleh',
    header: 'Oleh',
    className: 'text-xs text-[var(--text-dim)]',
    render: (item) => item.user_full_name,
  },
];

export { JENIS_LABEL };
export default pmLineHistoryColumns;
