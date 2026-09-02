// src/components/pm-line/pmLineColumns.jsx
// New (docs/frontend/MIGRATION-PLAN.md Phase 8). Extracted from the
// hand-rolled <table> in pages/PmLineStatusPage.jsx - same 10 columns,
// same cell markup, following the buildPmPartColumns.jsx precedent from
// Phase 7. Function, not a static array: the last column's action buttons
// need onInputMonthly/onInputWeekly callbacks from the page's component
// state, same reason Phase 7's columns are a function.
//
// StatusWithKetepatan was a local component in PmLineStatusPage.jsx -
// moved here since it's only ever used inside these columns, not
// independently reusable elsewhere on the page.
import StatusBadge from '../data-display/StatusBadge';
import { Button } from '../ui/button';

function formatKetepatan(percentage) {
  return percentage === null || percentage === undefined ? 'belum ada data' : `Ketepatan ${percentage}%`;
}

function StatusWithKetepatan({ status, percentage }) {
  return (
    <div>
      <StatusBadge status={status} />
      <div className="mt-1 text-xs text-muted-foreground">{formatKetepatan(percentage)}</div>
    </div>
  );
}

function buildPmLineColumns({ onInputMonthly, onInputWeekly }) {
  return [
    {
      key: 'line',
      header: 'Line',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.line_name}</span>,
    },
    {
      key: 'tgl_monthly',
      header: 'Tgl Monthly Terakhir',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.tgl_pm_monthly_terakhir || '-'}</span>,
    },
    {
      key: 'poin_monthly',
      header: 'Poin',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.akumulasi_poin_monthly}</span>,
    },
    {
      key: 'sisa_hari_monthly',
      header: 'Sisa Hari Monthly',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.sisa_hari_monthly ?? '-'}</span>,
    },
    {
      key: 'status_monthly',
      header: 'Status Monthly',
      render: (line) => <StatusWithKetepatan status={line.status_monthly} percentage={line.ketepatan_monthly_percentage} />,
    },
    {
      key: 'tgl_weekly',
      header: 'Tgl Weekly Terakhir',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.tgl_pm_weekly_terakhir || '-'}</span>,
    },
    {
      key: 'poin_weekly',
      header: 'Poin',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.akumulasi_poin_weekly}</span>,
    },
    {
      key: 'sisa_hari_weekly',
      header: 'Sisa Hari Weekly',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.sisa_hari_weekly ?? '-'}</span>,
    },
    {
      key: 'status_weekly',
      header: 'Status Weekly',
      render: (line) => <StatusWithKetepatan status={line.status_weekly} percentage={line.ketepatan_weekly_percentage} />,
    },
    {
      key: 'actions',
      header: '',
      srHeader: 'Aksi',
      render: (line) => (
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => onInputMonthly(line)}>
            Input Monthly
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onInputWeekly(line)}>
            Input Weekly
          </Button>
        </div>
      ),
    },
  ];
}

export default buildPmLineColumns;
