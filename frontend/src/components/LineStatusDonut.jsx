// src/components/LineStatusDonut.jsx
// Reskin: props & output visual PERSIS sama - cuma layout/warna statis
// diganti utility Tailwind. Conic-gradient donut TETAP inline style (nilainya
// dihitung dari props saat render, gak bisa jadi utility class statis).
const DOT_CLASS = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' };

function LineStatusDonut({ healthy = 0, warning = 0, critical = 0, totalLabel = 'Total Line' }) {
  const total = healthy + warning + critical;
  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);

  const okPct = pct(healthy);
  const warnPct = pct(warning);
  // sisanya (danger) otomatis ngisi sampai 100%

  const gradient = `conic-gradient(
    var(--ok) 0% ${okPct}%,
    var(--warn) ${okPct}% ${okPct + warnPct}%,
    var(--danger) ${okPct + warnPct}% 100%
  )`;

  return (
    <div className="flex items-center gap-6">
      <div
        className="flex h-[180px] w-[180px] shrink-0 items-center justify-center rounded-full"
        style={{ background: total > 0 ? gradient : 'var(--panel-3)' }}
      >
        <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full bg-card">
          <div className="font-[var(--font-display)] text-[30px] font-semibold">{total}</div>
          <div className="text-[11px] text-[var(--text-faint)]">{totalLabel}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <StatusRow color="ok" label="Sehat" value={healthy} />
        <StatusRow color="warn" label="Perlu Perhatian" value={warning} />
        <StatusRow color="danger" label="Kritis" value={critical} />
      </div>
    </div>
  );
}

function StatusRow({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${DOT_CLASS[color]}`} />
      <span className="min-w-[110px] text-[13px] text-muted-foreground">{label}</span>
      <span className="font-[var(--font-mono)] font-semibold">{value}</span>
    </div>
  );
}

export default LineStatusDonut;
