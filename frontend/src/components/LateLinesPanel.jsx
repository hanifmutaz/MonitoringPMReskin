// src/components/LateLinesPanel.jsx
//
// Panel Dashboard "Line Terlambat": Line yang PM-nya sudah terlambat saat ini
// (PM Monthly/Weekly OVERDUE, atau counter Part melewati target shot).
// Klik Line -> LateLineEvidenceModal berisi bukti keterlambatannya (data sistem).
// Line yang sedang tidak running TETAP tampil (PM-nya tetap wajib dikerjakan),
// hanya diberi penanda.
import { useState } from 'react';
import { AlarmClockOff } from 'lucide-react';
import { Card, CardHeader, CardTitle } from './ui/card';
import { EmptyState } from './ui/empty-state';
import { Skeleton } from './ui/skeleton';
import LateLineEvidenceModal from './LateLineEvidenceModal';

export const LATE_TYPE_LABEL = {
  PM_LINE_MONTHLY: 'PM Monthly',
  PM_LINE_WEEKLY: 'PM Weekly',
  PM_PART: 'PM Part',
};

function formatDays(value) {
  if (value === null || value === undefined) return 'Tidak terukur';
  return `${Number(value).toLocaleString('id-ID')} hari`;
}

function LateLinesPanel({ data = [], isLoading }) {
  const [selected, setSelected] = useState(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Line Terlambat</CardTitle></CardHeader>
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <AlarmClockOff size={16} />
          Line Terlambat PM
          {data.length > 0 && (
            <span className="ml-1 rounded-full bg-danger-dim px-2 py-0.5 font-[var(--font-mono)] text-[11px] text-danger">
              {data.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      {data.length === 0 ? (
        <EmptyState
          icon={AlarmClockOff}
          tone="ok"
          className="border-0 py-8"
          title="Tidak ada Line yang terlambat"
          description="Semua PM Monthly, Weekly, dan Part masih dalam batas jadwal."
        />
      ) : (
        <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Tabel Line terlambat PM (scroll horizontal)">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Line', 'Yang Terlambat', 'Terlambat Paling Lama'].map((h) => (
                  <th key={h} scope="col" className="border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.line_id} className="hover:bg-[var(--panel-2)]">
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className="cursor-pointer rounded font-[var(--font-mono)] text-[13px] font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                      aria-label={`Lihat evidence keterlambatan ${row.line_name}`}
                    >
                      {row.line_name}
                    </button>
                    {row.is_idle && (
                      <span className="ml-2 rounded-full bg-[var(--panel-3)] px-2 py-0.5 text-[11px] text-[var(--text-faint)]" title="Line sedang tidak running, PM tetap wajib dikerjakan">
                        Tidak running
                      </span>
                    )}
                  </td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 text-xs text-[var(--text-dim)]">
                    {row.types.map((t) => LATE_TYPE_LABEL[t] || t).join(', ')}
                    <span className="ml-1.5 text-[var(--text-faint)]">({row.total_late} item)</span>
                  </td>
                  <td className="border-b border-[var(--border-soft)] px-2.5 py-2.5 font-[var(--font-mono)] text-[13px] text-danger">
                    {formatDays(row.max_late_days)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <LateLineEvidenceModal lineId={selected.line_id} lineName={selected.line_name} onClose={() => setSelected(null)} />
      )}
    </Card>
  );
}

export default LateLinesPanel;
