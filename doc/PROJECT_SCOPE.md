# Project Scope & Delivery Status — PM Monitoring

Dokumen ini menjawab satu pertanyaan yang paling penting saat serah terima:
**"Bagian mana yang sudah selesai, dan bagian mana yang masih bergantung
pada sesuatu di luar kendali developer?"** Statusnya diverifikasi langsung
dari kode per 19 Juli 2026, bukan dari ingatan/asumsi.

---

## Fase 1 & 2 — Selesai penuh

Semua fitur inti berjalan tanpa dependency eksternal yang belum tersedia:

- Autentikasi & otorisasi (login, RBAC Admin/Operator, session via HttpOnly cookie)
- Master Data: Lines, Parts, CL Mapping — lengkap dengan constraint integritas
  (mis. tidak bisa hapus Part yang masih punya riwayat PM)
- PM Part tracking: kalkulasi counter cross-CL, status OK/WARNING/DANGER,
  estimasi tanggal PM — berdasarkan formula MASTER DOCUMENT Bagian 2.A
- PM Line tracking (Weekly & Monthly) — formula Bagian 2.B & 2.C
- User Management (CRUD user, ubah role, reset password, aktif/nonaktif)
- Dashboard (KPI, Attention list, Upcoming/Gantt, sync status)
- Settings (threshold & konfigurasi bisnis, bukan hardcode)
- Audit Log untuk Master Data, User Management, PM History

## Fase 3 — Adapter Sync ConMas — **Selesai, dengan 1 syarat operasional**

Status sebelumnya (per catatan kode lama): diblokir, menunggu struktur
tabel ConMas dikonfirmasi. **Blocker ini sudah selesai per 18 Juli 2026**
(dikonfirmasi lewat komentar commit "sync ConMas DB" — 1 hari sebelum sesi
ini). Diverifikasi langsung ada & wired penuh di kode:

- `services/conmasSyncService.js` — sync `production_cache` dari ConMas
  (`view_report_25415`), termasuk logika penggabungan Reject ke shot count
  sesuai konfirmasi pemilik project
- `services/pmMonthlyAccrualService.js` — job harian yang menghitung poin
  akumulasi PM Monthly dari run-count Line (fitur yang sempat jadi gap
  fungsional terbesar di audit sebelumnya — sekarang **sudah terisi**)
- `jobs/conmasSyncJob.js` — cron job yang menjalankan keduanya otomatis
  saat server start + berkala (interval dari `app_settings`, bukan hardcode)

**Syarat operasional yang perlu diperhatikan saat deploy/serah terima:**

1. **Butuh kredensial `CONMAS_DB_HOST/PORT/NAME/USER/PASSWORD`** di `.env`.
   Tanpa ini, aplikasi **tidak error/crash** — job sync otomatis di-skip
   dengan log warning (`"kredensial CONMAS_DB_* belum diisi"`), dan
   fitur lain tetap jalan normal. Tapi berarti PM Monthly tidak akan
   ter-update otomatis sampai kredensial ini diisi.
2. **Akun DB ConMas WAJIB read-only** (grant `SELECT` saja ke
   `view_report_25415`) — didesain sengaja terpisah dari akun operasional
   ConMas sendiri, sebagai isolasi keamanan (kalau kredensial ini bocor,
   dampaknya cuma baca data, bukan bisa mengubah apapun di sistem ConMas).
   Ini poin penting untuk dikomunikasikan ke tim yang pegang akses DB ConMas
   saat provisioning akun tersebut.
3. **Line di ConMas harus namanya sama persis** dengan `line_name` di Master
   Data PM Monitoring supaya ke-mapping. Line yang belum terdaftar di
   Master Data **sengaja di-skip** (bukan auto-create) — dicatat sebagai
   warning di log, bukan silent fail. Perlu pengecekan manual sekali di awal
   supaya semua Line ConMas yang relevan sudah terdaftar sebagai Master Data.

**Belum ada di luar ini:** tidak ditemukan referensi ke "Fase 4" atau
tahapan lanjutan lain di manapun dalam kode saat ini.

---

## Rekomendasi untuk serah terima ke Hirose

- Poin 1-3 di atas (kredensial ConMas, akun read-only, kecocokan nama Line)
  sebaiknya masuk checklist UAT/go-live, bukan diasumsikan otomatis beres.
- Kalau proses handover formal, minta konfirmasi tertulis bahwa kredensial
  `CONMAS_DB_*` sudah di-provision **sebelum** tanggal go-live, supaya PM
  Monthly langsung akurat sejak hari pertama, bukan "diam" sampai ada yang
  sadar kredensialnya belum diisi.
