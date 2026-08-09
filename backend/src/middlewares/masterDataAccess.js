// src/middlewares/masterDataAccess.js
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const settingsService = require('../services/settingsService');

/**
 * Master Data edit (CREATE/UPDATE, dan DELETE untuk part_cl_mapping):
 * Admin selalu boleh. Operator boleh HANYA kalau setting
 * allow_operator_edit_master_data = true (Development Rules §12,
 * 03_API_SPECIFICATION.md §3-5).
 *
 * DELETE untuk `lines` dan `parts` TIDAK pakai middleware ini — itu
 * Admin only secara eksplisit, pakai requireRole('Admin') biasa.
 */
const requireMasterDataEditAccess = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw AppError.unauthorized('Token tidak ada');
  }
  if (req.user.role === 'Admin') {
    return next();
  }
  if (req.user.role === 'Operator') {
    const allowed = await settingsService.getSetting('allow_operator_edit_master_data');
    if (allowed === true) {
      return next();
    }
  }
  throw AppError.forbidden('Role tidak punya akses untuk mengubah Master Data');
});

module.exports = requireMasterDataEditAccess;
