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

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  logLevel: process.env.LOG_LEVEL || 'info',

  // Identitas lokasi instance ini sendiri - 'internal' | 'sgp' | 'systech'.
  // Dipakai buat nge-tag response reporting & gating endpoint /multi-site
  // (cuma Internal yang boleh narik data lintas lokasi, lihat topologi
  // 1-arah di doc/Architecture.md).
  siteId: process.env.SITE_ID || 'internal',

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
