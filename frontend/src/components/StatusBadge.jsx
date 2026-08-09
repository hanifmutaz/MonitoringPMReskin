// src/components/StatusBadge.jsx
// Reskin: markup sama, class CSS lama (.badge/.badge-ok/dst) diganti utility
// Tailwind yang ngerujuk PERSIS ke token yang sama (lihat tailwind.css buat
// --color-ok/-warn/-danger, dan var(--...) langsung buat token yang belum
// di-expose ke Tailwind seperti --panel-3/--text-faint/--font-mono).
// Props (status) & output visual TIDAK berubah - .badge-* di components.css
// dibiarkan apa adanya karena masih dipakai langsung (bukan lewat komponen
// ini) di DashboardPage.jsx (badgeClassFor) dan tempat lain yang belum
// dimigrasi.
const CONFIG = {
  OK: { label: 'OK', bg: 'bg-ok-dim', text: 'text-ok', dot: 'bg-ok' },
  WARNING: { label: 'Warning', bg: 'bg-warn-dim', text: 'text-warn', dot: 'bg-warn' },
  DANGER: { label: 'Danger', bg: 'bg-danger-dim', text: 'text-danger', dot: 'bg-danger' },
};
const FALLBACK = { bg: 'bg-[var(--panel-3)]', text: 'text-[var(--text-faint)]', dot: 'bg-[var(--text-faint)]' };

function StatusBadge({ status }) {
  const normalized = (status || '').toUpperCase();
  const cfg = CONFIG[normalized] || FALLBACK;
  const label = cfg.label || status;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-[10px] py-[3px] text-xs font-[var(--font-mono)] ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}

export default StatusBadge;
