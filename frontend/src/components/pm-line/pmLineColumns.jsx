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
import { Pencil, CalendarDays, CalendarRange } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
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

function DateWithEdit({ value, canEdit, onEdit, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[13px]">
      {formatDate(value)}
      {canEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={label}
          title={label}
          className="rounded p-0.5 text-[var(--text-faint)] hover:bg-[var(--panel-3)] hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
      )}
    </span>
  );
}

// canSubmit=false (user tanpa permission 'pm_line.submit') -> kolom aksi input
// (Input Monthly/Weekly) tidak dirender.
function buildPmLineColumns({
  onInputMonthly,
  onInputWeekly,
  canSubmit = true,
  canEditDate = false,
  onEditMonthlyDate,
  onEditWeeklyDate,
  activeInput = null, // { lineId, jenisPm } - tombol Input yang sedang membuka form
}) {
  const isActive = (line, jenisPm) => activeInput?.lineId === line.line_id && activeInput?.jenisPm === jenisPm;

  const columns = [
    {
      key: 'line',
      header: 'Line',
      render: (line) => <span className="font-[var(--font-mono)] text-[13px]">{line.line_name}</span>,
    },
    {
      key: 'tgl_monthly',
      header: 'Tgl Monthly Terakhir',
      render: (line) => (
        <DateWithEdit
          value={line.tgl_pm_monthly_terakhir}
          canEdit={canEditDate}
          onEdit={() => onEditMonthlyDate?.(line)}
          label="Koreksi tanggal Monthly"
        />
      ),
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
      render: (line) => (
        <DateWithEdit
          value={line.tgl_pm_weekly_terakhir}
          canEdit={canEditDate}
          onEdit={() => onEditWeeklyDate?.(line)}
          label="Koreksi tanggal Weekly"
        />
      ),
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
        // Tombol icon-only (hemat lebar kolom, tabel tidak perlu scroll
        // samping). Nama aksi muncul saat hover/fokus lewat Tooltip, dan
        // tetap ada di aria-label untuk screen reader.
        <TooltipProvider delayDuration={100}>
          <div className="flex gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={isActive(line, 'MONTHLY') ? 'default' : 'outline'}
                  aria-pressed={isActive(line, 'MONTHLY')}
                  className="h-8 w-8"
                  aria-label="Input Monthly"
                  onClick={() => onInputMonthly(line)}
                >
                  <CalendarDays size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>PM Monthly</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={isActive(line, 'WEEKLY') ? 'default' : 'outline'}
                  aria-pressed={isActive(line, 'WEEKLY')}
                  className="h-8 w-8"
                  aria-label="Input Weekly"
                  onClick={() => onInputWeekly(line)}
                >
                  <CalendarRange size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>PM Weekly</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];
  return canSubmit ? columns : columns.filter((c) => c.key !== 'actions');
}

export default buildPmLineColumns;
