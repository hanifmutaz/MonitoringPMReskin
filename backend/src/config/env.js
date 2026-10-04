// src/config/env.js
require('dotenv').config();

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    // Fail fast saat startup kalau config wajib belum di-set — lebih baik
    // gagal di awal daripada error tak jelas di tengah request.
    throw new Error(`[CONFIG] Missing required environment variable: ${key}`);
  }
}

// Guard production: JWT_SECRET yang pendek/placeholder = token bisa dipalsukan
// lewat brute-force offline. Di production wajib >= 32 karakter (generate
// pakai `openssl rand -hex 32`). Di dev/test dibiarkan bebas.
if ((process.env.NODE_ENV || 'development') === 'production') {
  const secret = process.env.JWT_SECRET;
  if (secret.length < 32 || /^(x+|changeme|secret|test)/i.test(secret)) {
    throw new Error(
      '[CONFIG] JWT_SECRET terlalu lemah untuk production (minimal 32 karakter & bukan placeholder). ' +
        "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
}

// LICENSE_PACKAGE sengaja FAIL OPEN ke 'B' (lihat komentar di export bawah),
// tapi nilai yang salah ketik (mis. 'a ' / 'C') jangan diam-diam dianggap 'B'
// tanpa jejak — logger belum bisa dipakai di sini (logger.js require env.js,
// circular), jadi pakai console.warn.
{
  const raw = process.env.LICENSE_PACKAGE;
  const normalized = (raw || '').trim().toUpperCase();
  if (raw !== undefined && raw !== '' && !['A', 'B'].includes(normalized)) {
    console.warn(`[CONFIG] LICENSE_PACKAGE="${raw}" tidak dikenali (harus 'A' atau 'B') -> fallback 'B' (full akses).`);
  } else if (!raw && (process.env.NODE_ENV || 'development') === 'production') {
    console.warn("[CONFIG] LICENSE_PACKAGE kosong di production -> default 'B' (full akses). Set eksplisit 'A' atau 'B'.");
  }
}

// Baca REMOTE_SITE_<N>_* dari env buat konfigurasi multi-site reporting.
// Cuma dipakai sama instance Internal buat narik data dari Subcont 1 & 2 -
// instance Subcont sendiri gak perlu isi ini sama sekali (array kosong,
// multiSiteService otomatis no-op). Format per-site (N = 1, 2, ...):
//   REMOTE_SITE_1_ID=sgp
//   REMOTE_SITE_1_LABEL=Subcont SGP
//   REMOTE_SITE_1_BASE_URL=https://sgp.pm-monitoring.internal
//   REMOTE_SITE_1_API_KEY=<api key yang diterbitkan sama instance SGP>
function parseRemoteSites() {
  const sites = [];
  for (let i = 1; ; i += 1) {
    const baseUrl = process.env[`REMOTE_SITE_${i}_BASE_URL`];
    if (!baseUrl) break; // berhenti begitu nomor urut terputus

    const apiKey = process.env[`REMOTE_SITE_${i}_API_KEY`];
    if (!apiKey) {
      // Site kesebut tapi API key-nya kosong = misconfig. Skip + biarkan
      // multiSiteService yang lapor "unreachable", jangan bikin startup crash
      // (filosofi sama dengan CONMAS_DB_* / SMTP_* di bawah).
      continue;
    }

    sites.push({
      id: process.env[`REMOTE_SITE_${i}_ID`] || `site-${i}`,
      label: process.env[`REMOTE_SITE_${i}_LABEL`] || `Site ${i}`,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      apiKey,
    });
  }
  return sites;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,

  databaseUrl: process.env.DATABASE_URL,

  // Tuning pool Postgres (semua opsional, default aman). DB_SSL=true buat DB
  // managed/remote yang mewajibkan TLS; DB_SSL_REJECT_UNAUTHORIZED=false
  // hanya kalau sertifikat self-signed (pahami risikonya).
  dbPool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_MS, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT_MS, 10) || 5000,
    statementTimeoutMs: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS, 10) || undefined, // default: tanpa timeout (job recompute/import bisa lama)
    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : undefined,
  },

  // Kredensial DB ConMas TIDAK di-require saat startup (§REQUIRED_VARS) -
  // supaya app tetap bisa jalan buat development/testing walau ConMas
  // belum/gak bisa diakses. Sync job (src/jobs/conmasSyncJob.js) yang
  // handle kalau kredensial ini kosong/salah, bukan bikin seluruh app crash.
  conmas: {
    host: process.env.CONMAS_DB_HOST,
    port: parseInt(process.env.CONMAS_DB_PORT, 10) || 5432,
    database: process.env.CONMAS_DB_NAME,
    user: process.env.CONMAS_DB_USER,
    password: process.env.CONMAS_DB_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    // Sesi lebih panjang khusus role 'Display' (akun monitor/TV), lihat
    // utils/jwt.js. Akun ini view-only; nonaktifkan akunnya di User
    // Management untuk mencabut akses seketika (is_active dicek tiap request).
    displayExpiresIn: process.env.JWT_EXPIRES_IN_DISPLAY || '30d',
  },

  // Kredensial SMTP TIDAK di-require saat startup (§REQUIRED_VARS) - sama
  // filosofi dengan ConMas: app tetap jalan walau SMTP belum dikonfigurasi.
  // notificationService yang handle kalau config ini kosong (log warning,
  // skip pengiriman) - bukan bikin seluruh app crash.
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'PM Monitoring <no-reply@hirose.local>',
  },

  // Jumlah hop reverse proxy di depan app (nginx/Caddy/LB) — dipakai Express
  // buat baca IP asli klien (req.ip), yang dipakai rate limiter login &
  // login audit log. Salah set = semua klien kelihatan satu IP (rate limit
  // salah sasaran) atau IP bisa dipalsukan lewat X-Forwarded-For.
  trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS, 10) >= 0 ? parseInt(process.env.TRUST_PROXY_HOPS, 10) : 1,

  // Flag Secure di cookie auth. Default: true di production (butuh HTTPS —
  // browser TIDAK menyimpan cookie Secure di http:// selain localhost).
  // COOKIE_SECURE=false hanya buat deployment LAN internal tanpa HTTPS;
  // token jadi bisa disadap di jaringan, jadi pahami risikonya.
  cookieSecure:
    process.env.COOKIE_SECURE !== undefined && process.env.COOKIE_SECURE !== ''
      ? process.env.COOKIE_SECURE === 'true'
      : (process.env.NODE_ENV || 'development') === 'production',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Backup database lewat tombol di Settings (Admin). Memanggil `pg_dump`
  // (format custom, sama dengan perintah di README -> restore pakai
  // `pg_restore`). Di Docker, pg_dump sudah ikut di image backend. Di
  // deployment non-Docker (mis. Windows/IIS) isi PG_DUMP_PATH dengan path
  // lengkap, mis. "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe".
  backup: {
    pgDumpPath: process.env.PG_DUMP_PATH || 'pg_dump',
    timeoutMs: parseInt(process.env.BACKUP_TIMEOUT_MS, 10) || 10 * 60 * 1000,
  },

  logLevel: process.env.LOG_LEVEL || 'info',

  // Identitas lokasi instance ini sendiri - 'internal' | 'sgp' | 'systech'.
  // Dipakai buat nge-tag response reporting & gating endpoint /multi-site
  // (cuma Internal yang boleh narik data lintas lokasi, lihat topologi
  // 1-arah di doc/Architecture.md).
  siteId: process.env.SITE_ID || 'internal',

  // Paket lisensi instance ini - 'A' (PM Monitoring standalone) atau 'B'
  // (PM Monitoring + Inventory Integration). Beda dari role/permission:
  // ini boundary PRODUK/KONTRAK (dijual terpisah ke client), bukan hak
  // akses per-user. Default 'B' (full) kalau env kosong ATAU nilainya
  // gak dikenali - sengaja FAIL OPEN biar deployment lama yang belum
  // sempat di-set env-nya gak tiba-tiba kehilangan akses Inventory.
  // Cek requireLicensePackage() di licenseMiddleware.js (backend enforcement)
  // dan AuthContext.jsx/hasPackage() (frontend gating: sidebar grayed-out +
  // UpgradePage) buat pemakaiannya.
  licensePackage: ['A', 'B'].includes((process.env.LICENSE_PACKAGE || '').trim().toUpperCase())
    ? process.env.LICENSE_PACKAGE.trim().toUpperCase()
    : 'B',

  reporting: {
    // API key milik instance ini SENDIRI - dipakai buat verifikasi request
    // masuk ke GET /api/reporting/site-summary (service-to-service, bukan
    // login manusia). TIDAK required saat startup: kalau kosong, endpoint
    // reporting otomatis nolak semua request (fail closed, lihat
    // apiKeyMiddleware.js) tapi app tetap jalan normal buat fitur lain.
    apiKey: process.env.REPORTING_API_KEY || null,

    // Timeout per-site saat Internal narik data dari Subcont, biar 1 Subcont
    // yang lemot/down gak nge-hang seluruh request /dashboard/multi-site.
    fetchTimeoutMs: parseInt(process.env.REMOTE_SITE_FETCH_TIMEOUT_MS, 10) || 5000,

    // Daftar lokasi remote yang bisa ditarik datanya (kosong kalau instance
    // ini bukan Internal, atau belum dikonfigurasi).
    remoteSites: parseRemoteSites(),
  },
};
