// src/middlewares/apiKeyMiddleware.js
// Auth buat endpoint yang dipanggil ANTAR SERVER (Internal narik data dari
// Subcont), bukan oleh manusia login lewat browser. Sengaja dipisah dari
// authMiddleware.js (JWT cookie) - beda "siapa yang manggil":
//   - authMiddleware  = user, lewat cookie httpOnly
//   - apiKeyMiddleware = instance lain, lewat header X-API-Key
//
// Fail closed: kalau REPORTING_API_KEY belum di-set di instance ini,
// endpoint yang dipasangi middleware ini otomatis nolak SEMUA request -
// lebih aman daripada default "terbuka" saat lupa konfigurasi.
const env = require('../config/env');
const AppError = require('../utils/AppError');

function requireApiKey(req, res, next) {
  const configuredKey = env.reporting.apiKey;

  if (!configuredKey) {
    throw AppError.unauthorized('Reporting API belum dikonfigurasi di instance ini');
  }

  const providedKey = req.get('X-API-Key');

  if (!providedKey || providedKey !== configuredKey) {
    throw AppError.unauthorized('API key tidak valid');
  }

  next();
}

module.exports = requireApiKey;
