// src/middlewares/permissionMiddleware.js
const AppError = require('../utils/AppError');

/**
 * Factory permission-check middleware. Dipasang SETELAH requireAuth.
 * Admin SELALU bypass (superuser) - req.user.permissions berisi ['*'] untuk
 * Admin (lihat authMiddleware.js), jadi cukup cek includes('*') di sini,
 * tanpa perlu hardcode nama role 'Admin' lagi di banyak tempat.
 *
 * Contoh: router.post('/', requireAuth, requirePermission('inventory.manage'), ctrl.create)
 */
function requirePermission(permissionKey) {
  return function permissionCheck(req, res, next) {
    if (!req.user) {
      throw AppError.unauthorized('Token tidak ada');
    }
    const perms = req.user.permissions || [];
    if (perms.includes('*') || perms.includes(permissionKey)) {
      return next();
    }
    throw AppError.forbidden(`Role Anda tidak punya akses "${permissionKey}"`);
  };
}

module.exports = requirePermission;
