// src/components/LineStatusDonut.jsx
// Ukuran donut dikembalikan ke sweet spot 200/130 (bukan 240/160 yang
// sempat dicoba - kegedean, apalagi di DashboardPmLineWeeklyPage yang render
// DUA donut bersebelahan di grid 2 kolom). Angka tengah & legend tetap
// diperbesar dari versi awal (30->40 angka, gap legend dilonggarin) supaya
// tetap terasa "berisi" tanpa bikin panel jadi ketinggian. Dipakai di 3
// halaman: DashboardPage, DashboardPmPartPage, DashboardPmLineWeeklyPage.
const DOT_CLASS = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
};

function LineStatusDonut({
  healthy = 0,
  warning = 0,
  critical = 0,
  totalLabel = 'Total Line',
}) {
  const total = healthy + warning + critical;
  const pct = (n) => (total > 0 ? (n / total) * 100 : 0);

  const okPct = pct(healthy);
  const warnPct = pct(warning);

  const gradient = `conic-gradient(
    var(--ok) 0% ${okPct}%,
    var(--warn) ${okPct}% ${okPct + warnPct}%,
    var(--danger) ${okPct + warnPct}% 100%
  )`;

  return (
    <div className="flex items-center gap-8">
      <div
        className="flex h-[200px] w-[200px] shrink-0 items-center justify-center rounded-full"
        style={{ background: total > 0 ? gradient : 'var(--panel-3)' }}
      >
        <div className="flex h-[130px] w-[130px] flex-col items-center justify-center rounded-full bg-card">
          <div className="font-[var(--font-display)] text-[40px] font-semibold leading-none tracking-tight">
            {total}
          </div>
          <div className="mt-2 text-[12px] text-[var(--text-faint)]">{totalLabel}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <StatusRow color="ok" label="Sehat" value={healthy} />
        <StatusRow color="warn" label="Perlu Perhatian" value={warning} />
        <StatusRow color="danger" label="Kritis" value={critical} />
      </div>
    </div>
  );
}

function StatusRow({ color, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASS[color]}`} />
      <span className="min-w-[130px] text-[14px] text-muted-foreground">{label}</span>
      <span className="font-[var(--font-display)] text-[20px] font-semibold leading-none">{value}</span>
    </div>
  );
}

export default LineStatusDonut;
