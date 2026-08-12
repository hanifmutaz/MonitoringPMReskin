// src/controllers/recycleBinController.js
const recycleBinService = require('../services/recycleBinService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const listEntities = asyncHandler(async (req, res) => {
  const data = recycleBinService.listEntities();
  res.status(200).json({ success: true, message: 'Success', data });
});

const listDeleted = asyncHandler(async (req, res) => {
  const data = await recycleBinService.listDeleted(req.params.entity);
  res.status(200).json({ success: true, message: 'Success', data });
});

const restore = asyncHandler(async (req, res) => {
  const data = await recycleBinService.restore(req.params.entity, Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const permanentDelete = asyncHandler(async (req, res) => {
  await recycleBinService.permanentDelete(req.params.entity, Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

const bulkDelete = asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.ids)) {
    throw AppError.badRequest('Validasi gagal', { ids: 'ids harus berupa array' });
  }
  const data = await recycleBinService.bulkSoftDelete(req.params.entity, req.body.ids, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { listEntities, listDeleted, restore, permanentDelete, bulkDelete };