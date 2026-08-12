// src/components/PackageLockedNotice.jsx
// Komponen SHARED buat notice "fitur Paket B belum aktif" - dipakai di 2
// konteks beda:
// 1. Full page (UpgradePage.jsx, dipanggil PackageRoute.jsx buat route
//    /inventory & /inventory/history)
// 2. Inline/compact, di DALAM halaman yang sendirinya udah kebuka (mis. tab
//    Suppliers di MasterDataPage, atau isi PartSupplierModal) - karena
//    Supplier itu SATU TAB di antara beberapa tab lain yang tetap kebuka
//    normal (Lines/Parts/Import), jadi gak masuk akal nge-lock SELURUH
//    halaman kayak /inventory (yang isinya emang cuma 1 fitur).
// Prop `compact` yang bedain 2 mode itu (padding/ukuran icon lebih kecil,
// tanpa kartu fitur list yang makan tempat).
import { Lock, CircleCheck } from 'lucide-react';

function PackageLockedNotice({ featureName, features, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 p-4 text-center ${compact ? 'py-10' : 'min-h-[70vh] gap-6'}`}>
      <div
        className={`flex items-center justify-center rounded-full bg-primary/10 text-primary ${compact ? 'h-14 w-14' : 'h-24 w-24'}`}
      >
        <Lock className={compact ? 'h-6 w-6' : 'h-11 w-11'} strokeWidth={1.5} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="mx-auto rounded-full bg-primary px-2.5 py-0.5 font-[var(--font-mono)] text-[11px] font-semibold text-white">
          PAKET B
        </span>
        <h1 className={`[font-family:var(--font-display)] font-semibold text-foreground ${compact ? 'text-base' : 'text-xl'}`}>
          {featureName} belum aktif
        </h1>
        <p className={`mx-auto text-muted-foreground ${compact ? 'max-w-sm text-xs' : 'max-w-md text-sm'}`}>
          Fitur ini bagian dari Paket B. Sistem yang terpasang saat ini terdaftar Paket A, jadi bagian ini belum bisa
          diakses.
        </p>
      </div>

      {features && !compact && (
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 text-left">
          <h2 className="mb-3 [font-family:var(--font-display)] text-sm font-semibold text-foreground">
            Yang didapat kalau upgrade ke Paket B
          </h2>
          <ul className="flex flex-col gap-2.5">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-[var(--text-faint)]">
        Hubungi Administrator/System Owner untuk informasi upgrade paket.
      </p>
    </div>
  );
}

export default PackageLockedNotice;