// src/middlewares/roleMiddleware.js
const AppError = require('../utils/AppError');

/**
 * Factory role-check middleware. Dipasang SETELAH requireAuth di route.
 * Contoh: router.get('/settings', requireAuth, requireRole('Admin'), ctrl.list)
 *
 * Pengecekan role WAJIB di backend (bukan cuma sembunyikan tombol di
 * frontend) — Development Rules §12.
 */
function requireRole(...allowedRoles) {
  return function roleCheck(req, res, next) {
    if (!req.user) {
      throw AppError.unauthorized('Token tidak ada');
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden('Role tidak punya akses ke resource ini');
    }
    next();
  };
}

module.exports = requireRole;
