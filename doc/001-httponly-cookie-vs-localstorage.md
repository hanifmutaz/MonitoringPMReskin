# ADR 001 — JWT disimpan di HttpOnly Cookie, bukan localStorage

## Status
Accepted

## Context
Token JWT butuh disimpan di sisi client supaya user tetap login antar
request. Dua pola umum: `localStorage.setItem('token', jwt)` (dibaca
manual, dikirim via header `Authorization`), atau HttpOnly cookie (browser
yang kirim otomatis, JavaScript tidak bisa membacanya).

## Decision
Pakai HttpOnly cookie (`sameSite: 'strict'`, `secure` aktif di production).
Frontend (`AuthContext.jsx`) tidak pernah menyimpan token — status login
divalidasi ulang lewat `GET /me` yang membaca cookie.

## Consequences
- **Plus:** token tidak bisa dicuri lewat XSS yang cuma bisa jalankan
  JavaScript biasa (`document.cookie` tidak bisa baca HttpOnly cookie).
- **Plus:** `SameSite=Strict` sekaligus menutup vektor CSRF klasik tanpa
  perlu token CSRF terpisah (lihat ADR 004).
- **Minus:** butuh `credentials: true` di CORS config, sedikit lebih rumit
  untuk skenario cross-origin dibanding header `Authorization` biasa.
- **Minus:** tidak cocok untuk klien non-browser (mobile app native, CLI)
  yang tidak otomatis mengirim cookie — kalau nanti butuh itu, perlu jalur
  auth kedua (mis. API key atau `Authorization` header terpisah), bukan
  mengganti pola ini sepenuhnya.
