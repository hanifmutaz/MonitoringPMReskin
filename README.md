# PM Monitoring (Hirose)

Aplikasi monitoring Preventive Maintenance: **backend** Express + PostgreSQL, **frontend** React (Vite + Tailwind). Detail arsitektur ada di [`doc/Architecture.md`](doc/Architecture.md), scope di [`doc/PROJECT_SCOPE.md`](doc/PROJECT_SCOPE.md), review keamanan di [`doc/SECURITY_REVIEW.md`](doc/SECURITY_REVIEW.md).

```
backend/    API (Node 20, Express, node-pg-migrate)  → backend/scripts = tools ops
frontend/   SPA (Vite) + nginx.conf untuk production
tests/      E2E Playwright (a11y + responsive)
doc/ docs/  dokumentasi
```

## Development lokal

Prasyarat: Node 20, PostgreSQL 16.

```bash
# backend
cd backend
cp .env.example .env        # isi DATABASE_URL & JWT_SECRET minimal
npm ci
npm run migrate:up          # admin awal: ADMIN_DEFAULT_* (dev fallback: admin / ChangeMe123!)
npm run dev                 # http://localhost:4000

# frontend (terminal lain)
cd frontend
cp .env.example .env
npm ci
npm run dev                 # http://localhost:5173
```

Test & lint: `npm test` dan `npm run lint` di masing-masing folder (test backend butuh Postgres; set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=test`).
E2E: lihat header [`playwright.config.js`](playwright.config.js). Data dummy dashboard: `node scripts/seed-dashboard-dummy.js` (dev saja).

## Deploy production (Docker Compose)

Stack: `db` (Postgres) → `migrate` (one-shot) → `backend` → `frontend` (nginx: SPA + proxy `/api` & `/uploads`).

```bash
cp .env.example .env                    # POSTGRES_PASSWORD, ADMIN_DEFAULT_PASSWORD (min 12 karakter), dst
cp backend/.env.example backend/.env    # JWT_SECRET (>=32 char), CORS_ORIGIN, SMTP, CONMAS_DB_*, LICENSE_PACKAGE, SITE_ID
docker compose up -d --build
docker compose ps                       # backend harus healthy
```

Catatan penting:

- `DATABASE_URL`, `PORT`, `NODE_ENV` di-set oleh compose; jangan diisi di `backend/.env`.
- `CORS_ORIGIN` = URL publik tempat user membuka aplikasi. Karena frontend & API lewat nginx yang sama (same-origin), CORS praktis tidak terpakai, tapi tetap isi dengan benar.
- App **menolak start** di production kalau `JWT_SECRET` < 32 karakter/placeholder, dan migration seed-admin **gagal** kalau `ADMIN_DEFAULT_PASSWORD` kosong/lemah.
- `LICENSE_PACKAGE` kosong = paket **B** (full akses). Instance client Paket A **wajib** `LICENSE_PACKAGE=A`.
- Jalankan **satu** instance `backend` (cron ConMas sync & notifikasi jalan in-process; scale-out = job ganda).
- Setelah login pertama: ganti password admin, lalu hapus `ADMIN_DEFAULT_PASSWORD` dari `.env`.

### HTTPS (wajib)

Cookie auth ber-flag `Secure` di production, jadi tanpa HTTPS browser tidak akan menyimpannya dan login gagal. Taruh reverse proxy TLS di depan, contoh Caddy di host:

```
pm.contoh.co.id {
  reverse_proxy 127.0.0.1:8080
}
```

lalu di `.env`: `HTTP_BIND=127.0.0.1` dan `TRUST_PROXY_HOPS=2` (nginx container + Caddy). `TRUST_PROXY_HOPS` yang salah membuat rate limit login & audit log memakai IP yang salah.
LAN internal tanpa HTTPS: `COOKIE_SECURE=false` di `backend/.env` (token bisa disadap di jaringan — pahami risikonya).

### Update / rilis versi baru

```bash
git pull
docker compose exec -T db pg_dump -U pm_app -Fc pm_monitoring > backup-$(date +%F).dump   # SELALU backup dulu
docker compose up -d --build            # migrate jalan otomatis sebelum backend start
docker compose logs migrate backend --tail=50
```

### Backup & restore

```bash
# DB
docker compose exec -T db pg_dump -U pm_app -Fc pm_monitoring > backup.dump
docker compose exec -T db pg_restore -U pm_app -d pm_monitoring --clean --if-exists < backup.dump
# Foto profil (volume uploads)
docker run --rm -v <project>_uploads:/data -v "$PWD":/out alpine tar czf /out/uploads.tgz -C /data .
```

Jadwalkan backup DB harian (cron host) dan **uji restore** minimal sekali di mesin lain.

**Backup lewat aplikasi:** Admin bisa buka **Settings → Umum → Backup Data** dan pilih salah satu format. Tiap unduhan tercatat di Audit Log (beserta formatnya).

| Format | Untuk apa | Restore |
|---|---|---|
| **.dump** (disarankan) | Backup lengkap, sama dengan `pg_dump -Fc` di atas | `pg_restore -U pm_app -d pm_monitoring --clean --if-exists file.dump` |
| **.sql** | Script teks biasa, bisa dibuka di text editor | `psql -U pm_app -d pm_monitoring -f file.sql` ke database **kosong** |
| **.xlsx** | Semua tabel sebagai sheet Excel, untuk dilihat/diarsip | **Tidak bisa di-restore otomatis** (constraint, trigger & tipe data tidak ikut). Kolom `password_hash` tidak disertakan. |

Catatan:

- `.dump` dan `.sql` memakai `pg_dump`. Docker: sudah ada di image backend. Non-Docker (mis. Windows/IIS): pasang PostgreSQL client dengan versi **≥ server DB** dan isi `PG_DUMP_PATH` di `backend/.env`. Format `.xlsx` **tidak** butuh `pg_dump`.
- `.xlsx` dibatasi `BACKUP_EXCEL_MAX_ROWS` baris per tabel (default 100.000, yang terbaru dipertahankan). Tabel yang dipotong ditandai di sheet `_INFO`.
- Timeout proxy: nginx (compose) sudah diset 10 menit untuk endpoint ini. Di IIS/ARR naikkan *Time-out* di Server Proxy Settings kalau DB besar (default 120 detik).
- `.dump` dan `.sql` berisi seluruh data **termasuk akun user & hash password** — simpan di tempat aman. Foto profil tidak ikut (pakai langkah volume `uploads` di atas).
- Ini backup manual. Backup terjadwal otomatis tetap sebaiknya lewat cron host.

### Rollback

1. `docker compose stop backend frontend`
2. Migrasi terakhir bermasalah: `docker compose run --rm migrate npm run migrate:down` (mundur 1 langkah; **cek isi `down` dulu**, sebagian bisa menghapus data) — atau restore dari backup.
3. `git checkout <tag/commit lama>` lalu `docker compose up -d --build`.

## Tools ops (`backend/scripts/`)

Tidak ikut ke Docker image. Jalankan dari mesin yang punya checkout repo + akses ke DB (mis. lewat SSH tunnel), dengan `DATABASE_URL` yang sesuai:

| Script | Fungsi |
|---|---|
| `reset-password.js <username>` | Reset password (dari `NEW_PASSWORD` atau prompt, lolos password policy) |
| `diagnose-login.js [username]` | Cek kenapa login ditolak (tanpa mencetak hash/URL DB) |
| `seed-dashboard-dummy.js [--clean]` | Data dummy dashboard — **dev/demo saja** |

Di `NODE_ENV=production` masing-masing butuh `ALLOW_RESET_PASSWORD=true` / `ALLOW_DIAGNOSE=true` / `ALLOW_SEED_DUMMY=true`.

## Health check

- `GET /health` — liveness (proses hidup)
- `GET /health/ready` — readiness (cek koneksi DB); dipakai `HEALTHCHECK` Docker

## CI

`.github/workflows/backend-ci.yml`: lint, test (dengan Postgres), `npm audit --audit-level=high` untuk dependency production, build frontend, build image Docker. `e2e.yml`: Playwright (manual/PR; jadikan required check setelah terbukti stabil).

## Checklist go-live

- [ ] `JWT_SECRET` acak ≥ 32 karakter, `ADMIN_DEFAULT_PASSWORD` kuat, `POSTGRES_PASSWORD` acak
- [ ] HTTPS aktif, `TRUST_PROXY_HOPS` sesuai jumlah proxy
- [ ] `LICENSE_PACKAGE`, `SITE_ID`, `REPORTING_API_KEY` (beda tiap instance) terisi benar
- [ ] Akun DB ConMas benar-benar read-only (`GRANT SELECT` saja)
- [ ] Backup harian aktif & restore sudah diuji
- [ ] Password admin awal sudah diganti; `ADMIN_DEFAULT_PASSWORD` dihapus dari `.env`
- [ ] Deploy ke staging dulu; E2E hijau
