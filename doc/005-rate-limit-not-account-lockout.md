# ADR 005 — Rate limit per-IP, bukan account lockout per-username

## Status
Accepted

## Context
Proteksi umum terhadap brute-force login: rate limit per-IP, atau lockout
akun setelah N kali gagal berturut-turut. Keduanya punya trade-off yang
berbeda.

## Decision
Pakai rate limit per-IP (`express-rate-limit`, 10 request/15 menit di
`/auth/login`). TIDAK menambahkan hard lockout per-username.

## Consequences
- **Plus:** brute-force dari 1 sumber IP diperlambat signifikan.
- **Plus (alasan utama menolak lockout per-username):** lockout berbasis
  username murni rentan disalahgunakan sebagai Denial-of-Service — orang
  yang SEKADAR TAHU username orang lain (tidak perlu password) bisa
  mengunci akun itu berulang kali tanpa risiko apapun bagi dirinya.
- **Minus:** brute-force terdistribusi (banyak IP/botnet/proxy) tidak
  banyak terhambat oleh rate limit per-IP saja.
- **Revisit trigger:** kalau `login_audit_log` (lihat `SECURITY_REVIEW.md`
  Finding #2) menunjukkan pola brute-force terdistribusi nyata, opsi
  lanjutan adalah progressive delay atau CAPTCHA — bukan lockout permanen.
