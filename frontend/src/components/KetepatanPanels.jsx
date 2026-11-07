// src/components/KetepatanPanels.jsx
//
// Panel Ketepatan PM Dashboard Management: tabel tren 6 bulan dan daftar Line < 100%. Datanya sudah
// dinormalkan (utils/ketepatanDashboard.js) jadi sama untuk data lokal (bisa backdate) maupun snapshot site lain.
import { TrendingDown, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle } from './ui/card';
import { EmptyState } from './ui/empty-state';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { formatPct, pctTone, monthLabel, belowTargetRows } from '../utils/ketepatanDashboard';

const BADGE_CLASS = {
  accent: { bg: 'bg-ok-dim', text: 'text-ok', dot: 'bg-ok' },
  warn: { bg: 'bg-warn-dim', text: 'text-warn', dot: 'bg-warn' },
  danger: { bg: 'bg-danger-dim', text: 'text-danger', dot: 'bg-danger' },
  muted: { bg: 'bg-[var(--panel-3)]', text: 'text-muted-foreground', dot: 'bg-[var(--text-faint)]' },
};

const TH = 'border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]';
const TD = 'border-b border-[var(--border-soft)] px-2.5 py-2.5';

/** Badge persen: '—' abu-abu kalau belum ada event (bukan 100%/0%). */
export function PercentBadge({ percentage }) {
  const cfg = BADGE_CLASS[pctTone(percentage)];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-[10px] py-[3px] font-[var(--font-mono)] text-xs ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {formatPct(percentage)}
    </span>
  );
}

function TrendCell({ cell }) {
  if (!cell) return <span className="text-[var(--text-faint)]">—</span>;
  return (
    <div className="flex items-center gap-2">
      <PercentBadge percentage={cell.percentage} />
      {cell.total > 0 && <span className="text-[11px] text-[var(--text-faint)]">{cell.total} event</span>}
    </div>
  );
}

/**
 * Tren ketepatan per bulan (lama -> baru, berakhir di bulan terpilih). Kolom PM Part hanya muncul kalau datanya
 * ada (data lokal); site lain tidak menyediakannya. Bulan berjalan diberi tanda "(berjalan)".
 */
export function KetepatanTrendPanel({ data, currentMonth, selectedMonth }) {
  if (!data || data.length === 0) return null;
  const hasPart = data.some((r) => r.part);
  const columns = [...(hasPart ? [{ key: 'part', label: 'PM Part' }] : []), { key: 'monthly', label: 'Monthly' }, { key: 'weekly', label: 'Weekly' }];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Ketepatan PM per Bulan ({data.length} Bulan Terakhir)</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Tabel tren ketepatan PM per bulan (scroll horizontal)">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col" className={TH}>Bulan</th>
              {columns.map((c) => <th key={c.key} scope="col" className={TH}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className={`hover:bg-[var(--panel-2)] ${row.month === selectedMonth ? 'bg-[var(--panel-2)]' : ''}`}>
                <td className={`${TD} font-[var(--font-mono)] text-[13px]`}>
                  {monthLabel(row.month, 'short')}
                  {row.month === currentMonth && <span className="ml-1.5 text-[11px] text-[var(--text-faint)]">(berjalan)</span>}
                </td>
                {columns.map((c) => <td key={c.key} className={TD}><TrendCell cell={row[c.key]} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Semua Line dengan ketepatan PM < 100% (nilai terburuk Part/Monthly/Weekly), terburuk dulu.
 * `onPeriodChange` kosong = periode tetap (site lain). `onSelect` kosong = baris tidak bisa diklik.
 */
export function KetepatanBelowTargetPanel({ items, period, onPeriodChange, onSelect, labels, isLoading }) {
  if (isLoading) return null;
  const rows = belowTargetRows(items);
  const periodLabel = labels[period];
  return (
    <Card>
      <CardHeader className="flex-wrap gap-2">
        <CardTitle className="flex items-center gap-1.5">
          <TrendingDown size={16} />
          Line Ketepatan PM di Bawah 100% ({periodLabel})
          {rows.length > 0 && (
            <span className="ml-1 rounded-full bg-[var(--panel-3)] px-2 py-0.5 font-[var(--font-mono)] text-[11px] text-muted-foreground">{rows.length}</span>
          )}
        </CardTitle>
        {onPeriodChange && (
          <Tabs value={period} onValueChange={onPeriodChange}>
            <TabsList aria-label="Periode ketepatan">
              <TabsTrigger value="month">{labels.monthTab}</TabsTrigger>
              <TabsTrigger value="year">{labels.yearTab}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>
      {rows.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          tone="ok"
          className="border-0 py-8"
          title="Semua Line ketepatan PM 100%"
          description={`Tidak ada Line dengan ketepatan di bawah 100% (${periodLabel.toLowerCase()}), atau belum ada event PM di periode ini.`}
        />
      ) : (
        <div className="max-h-[420px] overflow-auto" tabIndex="0" role="region" aria-label="Tabel Line ketepatan PM di bawah 100% (scroll)">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Line', 'Ketepatan PM Part', 'Ketepatan Monthly', 'Ketepatan Weekly'].map((h) => (
                  <th key={h} scope="col" className={`${TH} sticky top-0 z-10 bg-card`}>{h}</th>
                ))}
                {onSelect && <th scope="col" className={`${TH} sticky top-0 z-10 bg-card`}><span className="sr-only">Detail</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.line_id}
                  className={`hover:bg-[var(--panel-2)] ${onSelect ? 'cursor-pointer' : ''}`}
                  onClick={onSelect ? () => onSelect(row) : undefined}
                >
                  <td className={`${TD} font-[var(--font-mono)] text-[13px]`}>
                    {onSelect ? (
                      <button type="button" className="cursor-pointer text-left underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring" onClick={(e) => { e.stopPropagation(); onSelect(row); }}>
                        {row.line_name}
                      </button>
                    ) : row.line_name}
                  </td>
                  <td className={TD}><PercentBadge percentage={row.part_percentage} /></td>
                  <td className={TD}><PercentBadge percentage={row.monthly_percentage} /></td>
                  <td className={TD}><PercentBadge percentage={row.weekly_percentage} /></td>
                  {onSelect && <td className={`${TD} text-right text-muted-foreground`}><ChevronRight size={16} aria-hidden="true" className="inline" /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
