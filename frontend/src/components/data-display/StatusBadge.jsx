// src/components/data-display/StatusBadge.jsx
//
// Relocated from components/StatusBadge.jsx (docs/frontend/MIGRATION-PLAN.md
// Phase 5). Props (status) and visual output unchanged - only the file's
// location changes. components/StatusBadge.jsx now re-exports this file.
//
// Re-verified at relocation time (23 Aug 2026): the legacy `.badge`/
// `.badge-ok`/`.badge-warning`/`.badge-danger`/`.badge-muted` CSS classes
// in components.css that the original comment said were "still used
// directly in DashboardPage.jsx (badgeClassFor)" are NO LONGER referenced
// anywhere in the codebase - a repo-wide grep found zero live className
// usages of those classes (badgeClassFor itself no longer exists in
// DashboardPage.jsx). That duplication the audit flagged is already
// resolved; the dead `.badge-*` rules in components.css remain for Phase
// 14 (confirmed dead code removal) to clean up, not this phase.
//
// polish: A10 (motion, 08 Sep 2026) - motion pattern #7 (§6.3 di
// UI-CONSISTENCY-AUDIT.md): "Status change flash - pas data berubah (mis.
// jadi DANGER), badge flash/pulse 1x buat narik perhatian". Diskusi
// sebelumnya (sesi Fase 3 pertama) nge-flag ini butuh "state-diffing" yang
// keliatan kayak perubahan logic - ternyata TIDAK: diffing di sini cuma
// bandingin PROP `status` sebelum/sesudah DI DALAM komponen presentational
// yang sama (nggak nyentuh data-fetching/business logic di layer atasnya
// sama sekali - parent tetap ngirim status apa adanya, kapanpun). Ini
// murni reaksi lokal buat efek visual, sama kelasnya kayak
// useTabIndicator.js ngukur DOM - "logic" di sini cuma "kapan nge-render
// animasi", bukan "data apa yang ditampilin". Tetap sesuai DoD "nol
// perubahan logic/data" karena STATUS YANG DITAMPILIN nggak berubah sama
// sekali - cuma nambahin animasi pas dia berubah.
//
// Flash CUMA nyala kalau: (a) bukan render pertama (initial mount TIDAK
// flash - kalau nggak, seluruh tabel 50 baris bakal pulsing bareng pas
// halaman kebuka, kacau bukannya narik perhatian), DAN (b) status BARU-nya
// DANGER (per contoh di plan - transisi ke status LAIN, mis. OK->WARNING,
// sengaja nggak nge-flash, biar nggak "noisy" kalau semua transisi minor
// ikut nge-flash juga).
import { useEffect, useRef, useState } from 'react';

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

  const prevRef = useRef(normalized);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (prevRef.current !== normalized && normalized === 'DANGER') {
      setFlashKey((k) => k + 1);
    }
    prevRef.current = normalized;
  }, [normalized]);

  return (
    <span
      // `key` bikin animasi re-trigger tiap kali flashKey berubah (React
      // nge-treat elemen dengan key beda sebagai instance baru -> animasi
      // CSS jalan dari awal lagi). `flashKey === 0` (initial state, belum
      // pernah berubah) sengaja NOL animate class biar mount pertama diem.
      key={flashKey}
      className={`inline-flex items-center gap-1 rounded-full px-[10px] py-[3px] text-xs font-[var(--font-mono)] ${cfg.bg} ${cfg.text} ${flashKey > 0 ? 'animate-[status-flash_var(--duration-data)_var(--ease-standard)_1]' : ''}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}

export default StatusBadge;
