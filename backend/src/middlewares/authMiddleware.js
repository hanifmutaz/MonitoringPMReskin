// src/middlewares/authMiddleware.js
const { verifyToken } = require('../utils/jwt');
const userQueries = require('../sql/userQueries');
const permissionQueries = require('../sql/permissionQueries');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies && req.cookies.token;

  if (!token) {
    throw AppError.unauthorized('Token tidak ada');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw AppError.unauthorized('Token tidak valid atau expired');
  }

  const user = await userQueries.findUserById(payload.id);

  if (!user || !user.is_active) {
    throw AppError.unauthorized('User tidak ditemukan atau tidak aktif');
  }

  // Admin = superuser, bypass semua permission check (lihat
  // permissionMiddleware.js). Role lain: resolve permission dari
  // role_permissions - query per-request (bukan di-bake ke JWT) supaya
  // perubahan permission oleh Admin langsung berlaku tanpa perlu re-login.
  const permissions =
    user.role_name === 'Admin' ? ['*'] : await permissionQueries.findPermissionKeysByRoleId(user.role_id);

  req.user = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role_name,
    role_id: user.role_id,
    permissions,
  };
  next();
});

module.exports = requireAuth;