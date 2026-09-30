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

/**
 * Lolos kalau user punya SALAH SATU permission di daftar (atau Admin '*').
 * Dipakai buat endpoint yang legit dibutuhkan beberapa modul sekaligus,
 * mis. GET /lines yang jadi dropdown di form input PM DAN halaman Master
 * Data, atau create Inventory yang boleh lewat 'inventory.input' ATAUPUN
 * 'inventory.manage'.
 *
 * Contoh: router.post('/', requireAuth, requirePermission.any('inventory.input', 'inventory.manage'), ctrl.create)
 */
function requireAnyPermission(...permissionKeys) {
  return function anyPermissionCheck(req, res, next) {
    if (!req.user) {
      throw AppError.unauthorized('Token tidak ada');
    }
    const perms = req.user.permissions || [];
    if (perms.includes('*') || permissionKeys.some((key) => perms.includes(key))) {
      return next();
    }
    throw AppError.forbidden(`Role Anda tidak punya akses (butuh salah satu dari: ${permissionKeys.join(', ')})`);
  };
}

requirePermission.any = requireAnyPermission;

module.exports = requirePermission;
