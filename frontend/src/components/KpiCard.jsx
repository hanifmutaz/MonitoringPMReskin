// src/components/KpiCard.jsx
//
// REDESIGN (10 Sep 2026): floating icon badge -> inline icon + fix varian muted.
// -----------------------------------------------------------------------------
// (1) Floating badge lama (`absolute -top-3.5 right-4` + shadow) setengah keluar
//     kartu -> keliatan "stiker tempel". Dipindah INLINE di kiri label pakai
//     TINT halus (bg-*-dim). Konsisten sama kartu "Ketepatan PM" yang flat,
//     value jadi lebih dominan.
//
// (2) FIX badge "Nonaktif": varian `muted` DULU pakai text-[var(--text-faint)]
//     di atas panel-3 -> kontras 2.49:1, GAGAL WCAG (lihat OPEN-QUESTIONS.md
//     "--text-faint contrast"). Di light mode nyaris invisible (keliatan broken).
//     SEKARANG pakai token --neutral / --neutral-dim (baru di tokens.css):
//     tegas & lulus AA, tapi tetap "diam" (bukan warna status) biar gak nyuri
//     fokus dari OK/Warn/Danger.
//
// YANG DIPERTAHANKAN (nggak berubah): props API { icon,label,value,caption,
//   status } IDENTIK (14+ call site gak disentuh), useCountUp, fade-in+slide,
//   class `kpi-card` (stagger :nth-child), hover lift, semua motion token LOCKED,
//   warna dari token (tokens.css nggak dilanggar - neutral ditambah dgn izin).
import useCountUp from '../hooks/useCountUp';

// Tint per status: background lembut + icon berwarna.
// accent (brand) & muted (neutral) pakai arbitrary value karena bukan utility
// bawaan theme; ok/warn/danger pakai utility yang di-expose tailwind.css.
const ICON_TINT_CLASS = {
  accent: 'bg-[var(--accent-dim)] text-[var(--accent)]',
  ok: 'bg-ok-dim text-ok',
  warn: 'bg-warn-dim text-warn',
  danger: 'bg-danger-dim text-danger',
  // FIX: neutral (bukan panel-3 + text-faint yang gagal kontras)
  muted: 'bg-[var(--neutral-dim)] text-[var(--neutral)]',
};

function KpiCard({ icon, label, value, caption, status = 'accent' }) {
  const iconClass = ICON_TINT_CLASS[status] || ICON_TINT_CLASS.accent;
  const displayValue = useCountUp(value);
  return (
    <div className="kpi-card group relative animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-border bg-card p-5 shadow-sm duration-[var(--duration-slow)] ease-decelerate transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-md hover:duration-[var(--duration-base)]">
      {/* Baris atas: icon inline (kiri) + label. Icon container 32px, tint halus.
          Guard [&_svg]:h-[17px] biar icon lucide dari call site (size={16}/{22})
          konsisten pas di container inline. */}
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-[var(--duration-base)] group-hover:scale-[1.03] [&_svg]:h-[17px] [&_svg]:w-[17px] ${iconClass}`}
        >
          {icon}
        </span>
        <span className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">
          {label}
        </span>
      </div>

      {/* Value: mt-4 kasih nafas dari label. tabular-nums biar angka rata &
          gak goyang pas nilai berubah (count-up / refetch). */}
      <div className="mt-4 font-[var(--font-display)] text-[30px] font-semibold leading-none tracking-tight tabular-nums">
        {displayValue}
      </div>
      {caption && <div className="mt-1.5 text-xs text-muted-foreground">{caption}</div>}
    </div>
  );
}
export default KpiCard;
