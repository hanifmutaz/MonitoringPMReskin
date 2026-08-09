# ADR 002 — Role & is_active diverifikasi ulang ke DB di setiap request

## Status
Accepted

## Context
JWT umumnya membawa klaim (`role`) di payload-nya supaya tidak perlu query
DB tiap request — cepat, tapi klaim itu jadi "beku" sampai token expired.
Kalau Admin mengubah role user atau menonaktifkan akun, user yang tokennya
masih valid tetap bisa akses sesuai role/status LAMA sampai token itu
(8 jam) expired.

## Decision
`requireAuth` middleware memverifikasi SIGNATURE JWT (identitas: `id`),
lalu SELALU melakukan `SELECT role, is_active FROM users WHERE id = ?`
untuk request itu. `req.user.role` dibangun dari hasil query ini, bukan
dari payload JWT mentah.

## Consequences
- **Plus:** perubahan role atau nonaktifkan akun berlaku instan di request
  berikutnya — tidak perlu tunggu token expired atau paksa re-login.
- **Plus:** menutup dua masalah sekaligus dengan satu mekanisme (role
  staleness DAN revocation), tanpa perlu `tokenVersion`/session table
  terpisah.
- **Minus:** 1 query DB tambahan per-request terautentikasi. Untuk skala
  internal app ini (puluhan user, bukan traffic tinggi), biayanya
  diabaikan — lihat `TECHNICAL_DEBT.md` untuk kapan ini perlu dioptimasi
  (mis. kalau user aktif naik ke ratusan/ribuan bersamaan, opsi lanjutan
  adalah cache role dengan invalidation, bukan query polos tiap kali).
