// src/components/Banner.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 1/N - shared component,
// dipakai PmLineStatusPage/PmLineFormPage/PmPartFormPage): inline style
// lama dilepas total, diganti Tailwind, warna & layout visual TIDAK
// berubah (accent-dim bg + border accent + ikon Info). Props (children,
// tag) TIDAK berubah.
import { Info } from 'lucide-react';

function Banner({ children, tag }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-primary bg-[var(--accent-dim)] px-3.5 py-2.5 text-[13px] text-foreground">
      <Info size={16} className="shrink-0 text-primary" />
      <span className="flex-1">{children}</span>
      {tag && (
        <span className="rounded-full bg-primary px-2 py-0.5 font-[var(--font-mono)] text-[11px] text-white">
          {tag}
        </span>
      )}
    </div>
  );
}

export default Banner;
