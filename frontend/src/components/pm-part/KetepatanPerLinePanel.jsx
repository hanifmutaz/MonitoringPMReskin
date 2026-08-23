// src/components/pm-part/KetepatanPerLinePanel.jsx
// Extracted from pages/PmPartMonitoringPage.jsx (docs/frontend/
// MIGRATION-PLAN.md Phase 7 - domain/pm-part/ extraction). Was a local
// function component defined inline in the page file; markup, the
// ketepatanTone/KETEPATAN_CLASS helpers, and the usePmPartKetepatanPerLine
// call are unchanged, only the location (and therefore the hook's import
// path, ../hooks/x -> ../../hooks/x) moves.
//
// Mini-card per Line (bukan chip "Line X: 92%" seperti sebelumnya) - pola
// chip inline gak konsisten sama badge lain di app ini (badge di sini
// selalu [dot + 1 kata status], bukan [label: value]). Kartu kecil lebih
// gampang di-scan sekilas dan null-state-nya jelas beda warna (abu-abu,
// bukan hijau seolah "bagus").
import { usePmPartKetepatanPerLine } from '../../hooks/usePmPartList';

const KETEPATAN_CLASS = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  muted: 'text-[var(--text-faint)]',
};

function ketepatanTone(percentage) {
  if (percentage === null || percentage === undefined) return 'muted';
  if (percentage >= 90) return 'ok';
  if (percentage >= 50) return 'warn';
  return 'danger';
}

function KetepatanPerLinePanel() {
  const { data, isLoading } = usePmPartKetepatanPerLine();

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="mb-2.5 text-xs text-muted-foreground">Ketepatan PM Part per Line (tahun berjalan)</div>
      <div className="flex flex-wrap gap-2.5">
        {data.map((l) => (
          <div key={l.line_id} className="min-w-[120px] rounded-md border border-border bg-[var(--panel-2)] px-3.5 py-2.5">
            <div className="text-xs text-muted-foreground">{l.line_name}</div>
            <div className={`font-[var(--font-display)] text-[22px] font-semibold ${KETEPATAN_CLASS[ketepatanTone(l.percentage)]}`}>
              {l.percentage === null ? '-' : `${l.percentage}%`}
            </div>
            <div className="text-[11px] text-[var(--text-faint)]">
              {l.percentage === null ? 'belum ada data' : `${l.total} event`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KetepatanPerLinePanel;
