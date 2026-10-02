// src/middlewares/denyDisplayRole.js
// Akun role 'Display' (monitor/TV) murni view-only dashboard: tidak boleh
// membuka/ubah Settings maupun profil/password/avatar sendiri. Dipasang
// SETELAH requireAuth. Backend jadi penegak utama (Dev Rules §12), UI cuma
// menyembunyikan menunya.
const AppError = require('../utils/AppError');
const { DISPLAY_ROLE } = require('../utils/roles');

function denyDisplayRole(req, res, next) {
  if (!req.user) {
    throw AppError.unauthorized('Token tidak ada');
  }
  if (req.user.role === DISPLAY_ROLE) {
    throw AppError.forbidden('Akun Display tidak punya akses ke resource ini');
  }
  next();
}

module.exports = denyDisplayRole;
