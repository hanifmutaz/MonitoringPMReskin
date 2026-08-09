// src/controllers/userManagementController.js
const userManagementService = require('../services/userManagementService');
const { validateCreateUser, validateUpdateUser } = require('../validators/userValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const { role, is_active, status } = req.query;
  const data = await userManagementService.listUsers({
    role,
    isActive: is_active === undefined ? undefined : is_active === 'true',
    status,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const body = { ...req.body, role_id: req.body.role_id !== undefined ? Number(req.body.role_id) : undefined };
  const { valid, errors } = validateCreateUser(body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await userManagementService.createUser(body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.role_id !== undefined) body.role_id = Number(body.role_id);

  const { valid, errors } = validateUpdateUser(body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await userManagementService.updateUser(Number(req.params.id), body, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const approve = asyncHandler(async (req, res) => {
  const roleId = Number(req.body.role_id);
  if (!Number.isInteger(roleId)) {
    throw AppError.badRequest('Validasi gagal', { role_id: 'Role ID wajib diisi (integer) saat approve' });
  }
  const data = await userManagementService.approveUser(Number(req.params.id), roleId, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const reject = asyncHandler(async (req, res) => {
  const data = await userManagementService.rejectUser(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { list, create, update, approve, reject };
