// src/middlewares/licenseMiddleware.js
//
// Gating berbasis PAKET LISENSI (kontrak/dijual terpisah ke client), BEDA
// dari permissionMiddleware.js yang gating berbasis ROLE user dalam SATU
// instance. Satu instance = satu paket (di-set via LICENSE_PACKAGE env,
// lihat config/env.js) - berlaku ke SEMUA user di instance itu, apapun
// role-nya, termasuk Admin (Admin tetap gak bisa akses fitur yang emang
// gak dibeli client-nya).
//
// Ini PELENGKAP gating di frontend (Sidebar grayed-out + UpgradePage),
// bukan gantinya - kalau cuma di-gate di frontend, orang yang tau URL API
// masih bisa akses langsung lewat Postman/curl. Middleware ini yang jadi
// penegak utama di backend.

const config = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * @param {string} requiredPackage - paket minimum yang dibutuhkan ('B').
 * Instance dengan licensePackage 'B' otomatis lolos cek requiredPackage
 * 'A' ATAU 'B' (B mencakup semua fitur A + tambahan Inventory - lihat
 * diagram "Satu Sistem, Dua Paket"). Instance 'A' cuma lolos requiredPackage
 * 'A'.
 */
function requireLicensePackage(requiredPackage) {
  return (req, res, next) => {
    if (requiredPackage === 'A' || config.licensePackage === 'B') {
      return next();
    }

    throw AppError.forbidden(
      `Fitur ini bagian dari Paket B (Inventory Integration). Instance ini terdaftar Paket A.`
    );
  };
}

module.exports = { requireLicensePackage };
