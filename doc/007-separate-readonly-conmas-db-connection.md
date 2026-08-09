# ADR 007 — Koneksi DB ConMas terpisah, read-only, graceful-skip kalau belum dikonfigurasi

## Status
Accepted

## Context
Sync data produksi butuh baca dari DB sistem ConMas (eksternal, dimiliki
tim/sistem lain). Ada beberapa keputusan desain terkait: pakai koneksi apa,
privilege apa, dan apa yang terjadi kalau kredensialnya belum/tidak
tersedia.

## Decision
1. Koneksi terpisah (`conmasDb.js`), BUKAN pool yang sama dengan
   `db.js` (DB aplikasi sendiri).
2. Akun DB ConMas WAJIB read-only (grant `SELECT` saja ke
   `view_report_25415`), bukan akun operasional ConMas.
3. Kalau kredensial `CONMAS_DB_*` belum diisi di `.env`, job sync
   (`conmasSyncJob.js`) SKIP dengan log warning — bukan crash, bukan
   exception yang mengganggu fitur lain.

## Consequences
- **Plus (keamanan):** kalau kredensial ini bocor, dampaknya cuma baca
  data — tidak ada risiko sistem ConMas berubah/rusak lewat celah di sisi
  PM Monitoring. Isolasi privilege ini eksplisit didesain, bukan kebetulan.
- **Plus (operasional):** aplikasi PM Monitoring bisa di-deploy dan
  berfungsi penuh (Fase 1 & 2) SEBELUM kredensial ConMas di-provision —
  tidak ada hard dependency startup yang memblokir semuanya kalau
  integrasi eksternal ini belum siap.
- **Minus:** kalau kredensial lupa diisi saat go-live, PM Monthly tidak
  akan ter-update tanpa ada error yang mencolok (cuma warning di log) —
  ini sebabnya `PROJECT_SCOPE.md` eksplisit mencatat pengecekan ini sebagai
  item checklist UAT, bukan diasumsikan otomatis benar.
