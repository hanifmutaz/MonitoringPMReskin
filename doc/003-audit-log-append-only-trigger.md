# ADR 003 — Audit log append-only lewat DB trigger, bukan REVOKE privilege

## Status
Accepted

## Context
`audit_log`/`login_audit_log` cuma berguna sebagai bukti investigasi kalau
baris di dalamnya tidak bisa diubah/dihapus setelah tercatat. Ada 2 opsi
enforcement level-DB: `REVOKE UPDATE, DELETE` dari role aplikasi, atau
trigger yang menolak operasi itu untuk siapa pun.

## Decision
Pakai `BEFORE UPDATE OR DELETE` trigger yang selalu `RAISE EXCEPTION`,
diterapkan ke `audit_log` dan `login_audit_log`.

## Consequences
- **Plus:** trigger berlaku untuk SIAPA PUN yang connect ke DB, termasuk
  table OWNER — ini terverifikasi langsung (lihat catatan verifikasi di
  bawah), sesuatu yang `REVOKE` TIDAK bisa jamin (owner tabel di Postgres
  selalu punya semua privilege terlepas dari GRANT/REVOKE).
- **Minus (ditemukan & diperbaiki saat implementasi):** trigger ini awalnya
  bentrok dengan FK `ON DELETE SET NULL` di `user_id` — menghapus user
  memicu UPDATE cascade yang ikut diblokir trigger. Diperbaiki dengan
  mengubah FK jadi `ON DELETE RESTRICT` (migration `1700000005000`) —
  keputusan yang secara semantik lebih benar juga: user yang masih punya
  jejak audit tidak seharusnya bisa dihapus diam-diam.
- **Verifikasi:** dites langsung — bahkan sebagai `postgres` superuser
  (owner tabel), `UPDATE`/`DELETE` ke `audit_log` ditolak dengan error
  eksplisit, bukan cuma asumsi teoretis.
