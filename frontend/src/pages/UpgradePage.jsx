// src/pages/UpgradePage.jsx
// Halaman upgrade - muncul ketika instance Paket A akses route Paket B
// (Inventory), baik lewat klik menu grayed-out di Sidebar MAUPUN akses URL
// langsung (dipanggil dari PackageRoute.jsx). URL tetap sesuai yang diklik
// (mis. /inventory) - SENGAJA gak redirect ke halaman lain, biar konteks
// "fitur apa yang lagi diliat" gak ilang buat user.
// Style ngikutin pola NotFoundPage.jsx (icon bulat + judul + deskripsi),
// tapi list fitur & CTA-nya diambil dari isi kartu "PAKET B — Tambah
// Inventory" di ringkasan solusi (dikasih user via chat).
import { Lock, CircleCheck } from 'lucide-react';

const PAKET_B_FEATURES = [
  'Penggantian part langsung mengurangi stok dalam satu transaksi',
  'Data riwayat PM dan stok selalu konsisten',
  'Titik pemesanan dan safety stock dihitung dari pemakaian nyata',
  'Alert order otomatis saat stok perlu dipesan',
];

function UpgradePage({ featureName = 'Inventory Integration' }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-11 w-11" strokeWidth={1.5} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="mx-auto rounded-full bg-primary px-2.5 py-0.5 font-[var(--font-mono)] text-[11px] font-semibold text-white">
          PAKET B
        </span>
        <h1 className="[font-family:var(--font-display)] text-xl font-semibold text-foreground">
          {featureName} belum aktif
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Fitur ini bagian dari Paket B. Sistem yang terpasang saat ini terdaftar Paket A (PM Monitoring), jadi
          halaman ini belum bisa diakses.
        </p>
      </div>

      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 text-left">
        <h2 className="mb-3 [font-family:var(--font-display)] text-sm font-semibold text-foreground">
          Yang didapat kalau upgrade ke Paket B
        </h2>
        <ul className="flex flex-col gap-2.5">
          {PAKET_B_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-[var(--text-faint)]">
        Hubungi Administrator/System Owner untuk informasi upgrade paket.
      </p>
    </div>
  );
}

export default UpgradePage;
