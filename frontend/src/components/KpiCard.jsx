// src/components/KpiCard.jsx
// Reskin: props (icon, label, value, caption, status) & output visual PERSIS
// sama - cuma .kpi-card/.kpi-icon/dst diganti utility Tailwind.
// (Correction, Phase 6 dashboard migration: the note that used to be here
// about `.kpi-grid`/`.kpi-card` "dipakai buat loading skeleton di
// DashboardPage.jsx, belum dimigrasi" is stale - DashboardPage.jsx's own
// loading skeleton already moved off those classes to raw Tailwind a while
// back, and a repo-wide grep confirms zero live className references to
// either class anywhere in .jsx files. They're confirmed dead code left in
// components.css, for Phase 14 cleanup - not a real dependency of this
// file.)
// Class HARUS ditulis lengkap & statis di sini (bukan di-interpolate lewat
// template string) - Tailwind JIT nyari candidate class lewat regex di teks
// mentah file, jadi `bg-[var(--${status}-dim)]` gak bakal ke-detect dan
// hasilnya class kosong tanpa CSS. 'muted' dipakai buat state "belum ada
// data" - sengaja BUKAN salah satu dari accent/warn/danger (yang berarti
// baik/waspada/kritis), jadi dibedain manual pakai token netral yang sudah
// ada (panel-3/text-faint), bukan token baru.
// Polish pass (requested via chat, "Material Dashboard"-style KPI cards):
// icon moves from an inline dim-tinted box to a solid, floating badge with
// a soft shadow tinted to match its own status color (same --accent/--ok/
// --warn/--danger values already in tokens.css — no new colors introduced).
// Card itself gets a resting shadow-sm + a hover lift, still on --border/
// --color-card so it stays consistent with the rest of the dark theme.
// This intentionally departs from DESIGN-TOKENS.md's default "no shadow,
// layering only" rule for this one component — KpiCard is the dashboard's
// most-seen element, treated as the "genuinely elevated surface" exception
// the doc leaves room for. Not applied to Card.jsx/other panels.
const ICON_BADGE_CLASS = {
  accent: 'bg-[var(--accent)] shadow-[0_6px_16px_-4px_var(--accent)]',
  ok: 'bg-ok shadow-[0_6px_16px_-4px_var(--ok)]',
  warn: 'bg-warn shadow-[0_6px_16px_-4px_var(--warn)]',
  danger: 'bg-danger shadow-[0_6px_16px_-4px_var(--danger)]',
  muted: 'bg-[var(--panel-3)] text-[var(--text-faint)] shadow-none',
};

function KpiCard({ icon, label, value, caption, status = 'accent' }) {
  const iconClass = ICON_BADGE_CLASS[status] || ICON_BADGE_CLASS.accent;

  return (
    <div className="group relative overflow-visible rounded-xl border border-border bg-card p-4.5 pt-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30">
      <div
        className={`absolute -top-3.5 right-4 flex h-11 w-11 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-105 ${iconClass}`}
      >
        {icon}
      </div>
      <div className="mb-1 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
        {label}
      </div>
      <div className="font-[var(--font-display)] text-[30px] font-semibold tracking-tight">{value}</div>
      {caption && <div className="mt-1 text-xs text-muted-foreground">{caption}</div>}
    </div>
  );
}

export default KpiCard;
