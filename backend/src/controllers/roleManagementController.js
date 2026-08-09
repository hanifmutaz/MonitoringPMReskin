// src/controllers/roleManagementController.js
const roleManagementService = require('../services/roleManagementService');
const { validateCreateRole, validateUpdateRole } = require('../validators/roleValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const data = await roleManagementService.listRoles();
  res.status(200).json({ success: true, message: 'Success', data });
});

const listPermissions = asyncHandler(async (req, res) => {
  const data = await roleManagementService.listAvailablePermissions();
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const { valid, errors } = validateCreateRole(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await roleManagementService.createRole(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  const { valid, errors } = validateUpdateRole(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await roleManagementService.updateRole(Number(req.params.id), req.body, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const updatePermissions = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.permissions)) {
    throw AppError.badRequest('Validasi gagal', { permissions: 'permissions harus berupa array' });
  }
  const data = await roleManagementService.updateRolePermissions(Number(req.params.id), req.body.permissions, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const remove = asyncHandler(async (req, res) => {
  await roleManagementService.deleteRole(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

module.exports = { list, listPermissions, create, update, updatePermissions, remove };
