# ADR 004 — SameSite=Strict, tanpa CSRF token terpisah

## Status
Accepted (bersyarat — lihat trigger revisit)

## Context
Auth berbasis cookie umumnya butuh proteksi CSRF tambahan (CSRF token yang
dicek di setiap request state-changing), karena browser otomatis mengirim
cookie ke request cross-site. Tapi `SameSite` cookie attribute modern juga
bisa menutup vektor ini tanpa token tambahan.

## Decision
Cookie di-set `SameSite=Strict`, tanpa mekanisme CSRF token terpisah.

## Consequences
- **Plus:** `SameSite=Strict` memblokir cookie ikut terkirim pada request
  yang berasal dari origin lain sama sekali — menutup CSRF klasik tanpa
  kompleksitas tambahan (generate/validate token, expose ke frontend, dst).
- **Minus:** kalau nanti arsitektur berubah — butuh cross-origin request
  legit, embed lewat iframe di domain lain, atau integrasi SSO — pola ini
  TIDAK CUKUP, karena `SameSite=Strict` akan memblokir juga skenario yang
  sah, bukan cuma yang berbahaya.
- **Revisit trigger:** kalau ada kebutuhan cross-origin/iframe/SSO di masa
  depan, keputusan ini perlu ditinjau ulang — kemungkinan turun ke
  `SameSite=Lax` + CSRF token eksplisit.
