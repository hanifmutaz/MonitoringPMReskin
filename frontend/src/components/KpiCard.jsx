// src/components/KpiCard.jsx
// Reskin: props (icon, label, value, caption, status) & output visual PERSIS
// sama - cuma .kpi-card/.kpi-icon/dst diganti utility Tailwind. .kpi-grid
// & .kpi-card (dipakai buat loading skeleton di DashboardPage.jsx) dibiarkan
// di components.css apa adanya, belum dimigrasi.
// Class HARUS ditulis lengkap & statis di sini (bukan di-interpolate lewat
// template string) - Tailwind JIT nyari candidate class lewat regex di teks
// mentah file, jadi `bg-[var(--${status}-dim)]` gak bakal ke-detect dan
// hasilnya class kosong tanpa CSS. 'muted' dipakai buat state "belum ada
// data" - sengaja BUKAN salah satu dari accent/warn/danger (yang berarti
// baik/waspada/kritis), jadi dibedain manual pakai token netral yang sudah
// ada (panel-3/text-faint), bukan token baru.
const ICON_CLASS = {
  accent: 'bg-[var(--accent-dim)] text-[var(--accent)]',
  ok: 'bg-ok-dim text-ok',
  warn: 'bg-warn-dim text-warn',
  danger: 'bg-danger-dim text-danger',
  muted: 'bg-[var(--panel-3)] text-[var(--text-faint)]',
};

function KpiCard({ icon, label, value, caption, status = 'accent' }) {
  const iconClass = ICON_CLASS[status] || ICON_CLASS.accent;

  return (
    <div className="rounded-lg border border-border bg-card p-4.5">
      <div className={`mb-3 flex h-[34px] w-[34px] items-center justify-center rounded-sm ${iconClass}`}>
        {icon}
      </div>
      <div className="mb-1 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
        {label}
      </div>
      <div className="font-[var(--font-display)] text-[30px] font-semibold">{value}</div>
      {caption && <div className="mt-1 text-xs text-muted-foreground">{caption}</div>}
    </div>
  );
}

export default KpiCard;
