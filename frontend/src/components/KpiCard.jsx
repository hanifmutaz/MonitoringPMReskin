// src/components/KpiCard.jsx
//
// polish: A6 (KPI badge glow tuning, 08 Sep 2026) - shadow geometri
// ditarik lebih kecil/rapat (blur 12px->8px, spread -5px->-6px, offset-y
// 4px->3px) biar glow badge nggak lebih narik mata dari value. Warna
// TETAP dari token (--accent/--ok/--warn/--danger) - cuma geometri lokal
// yang diubah, tokens.css nggak disentuh (itu "kontrak tampilan").
// Lihat docs/frontend/UI-CONSISTENCY-AUDIT.md A6.
const ICON_BADGE_CLASS = {
  accent: 'bg-[var(--accent)] shadow-[0_3px_8px_-6px_var(--accent)]',
  ok: 'bg-ok shadow-[0_3px_8px_-6px_var(--ok)]',
  warn: 'bg-warn shadow-[0_3px_8px_-6px_var(--warn)]',
  danger: 'bg-danger shadow-[0_3px_8px_-6px_var(--danger)]',
  muted: 'bg-[var(--panel-3)] text-[var(--text-faint)] shadow-none',
};

function KpiCard({ icon, label, value, caption, status = 'accent' }) {
  const iconClass = ICON_BADGE_CLASS[status] || ICON_BADGE_CLASS.accent;

  return (
    <div className="group relative overflow-visible rounded-xl border border-border bg-card p-4.5 pt-7 shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md">
      <div
        className={`absolute -top-3.5 right-4 flex h-11 w-11 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-[1.03] ${iconClass}`}
      >
        {icon}
      </div>
      <div className="mb-1 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
        {label}
      </div>
      <div className="font-[var(--font-display)] text-[30px] font-semibold leading-none tracking-tight">
        {value}
      </div>
      {caption && <div className="mt-1.5 text-xs text-muted-foreground">{caption}</div>}
    </div>
  );
}

export default KpiCard;
