// src/components/pm-line/pmLineColumns.jsx
// Fase 1:
// - A1/D3: kolom "Tgl Monthly/Weekly Terakhir" pakai formatDate().
// - A4/D4: `StatusWithKetepatan` diubah dari 2-baris (status di atas, teks
//   "Ketepatan X%" di baris ke-2) jadi 1 baris: StatusBadge + PercentBadge
//   inline. Ini yang bikin row tabel Monitoring Monthly/Weekly ketinggian
//   (makan 2 baris/row). PercentBadge dibikin sekeluarga visual sama
//   OnTimeBadge/StatusBadge (dot + bg-dim + text mono) - bukan gaya baru.
import StatusBadge from '../data-display/StatusBadge';
import { Button } from '../ui/button';
import { formatDate } from '../../utils/formatDate';

function ketepatanTone(percentage) {
  if (percentage === null || percentage === undefined) return 'muted';
  if (percentage >= 90) return 'ok';
  if (percentage >= 50) return 'warn';
  return 'danger';
}

const PERCENT_BADGE_CLASS = {
  ok: { bg: 'bg-ok-dim', text: 'text-ok', dot: 'bg-ok' },
  warn: { bg: 'bg-warn-dim', text: 'text-warn', dot: 'bg-warn' },
  danger: { bg: 'bg-danger-dim', text: 'text-danger', dot: 'bg-danger' },
  muted: { bg: 'bg-[var(--panel-3)]', text: 'text-[var(--text-faint)]', dot: 'bg-[var(--text-faint)]' },
};

function KetepatanBadge({ percentage }) {
  const cfg = PERCENT_BADGE_CLASS[ketepatanTone(percentage)];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-[8px] py-[2px] font-[var(--font-mono)] text-[11px] ${cfg.bg} ${cfg.text}`}
      title="Ketepatan PM tahun berjalan"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {percentage === null || percentage === undefined ? '–' : `${percentage}%`}
    </span>
  );
}

// Status + ketepatan INLINE (satu baris), bukan ditumpuk 2 baris.
function StatusWithKetepatan({ status, percentage }) {
  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      <KetepatanBadge percentage={percentage} />
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
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{formatDate(line.tgl_pm_monthly_terakhir)}</span>,
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
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{formatDate(line.tgl_pm_weekly_terakhir)}</span>,
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
