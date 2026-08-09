// src/controllers/partController.js
const partService = require('../services/partService');
const { validateCreatePart, validateUpdatePart } = require('../validators/partValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const { line_id, search, page, limit } = req.query;
  const data = await partService.listParts({
    lineId: line_id ? Number(line_id) : undefined,
    search,
    page,
    limit,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const body = {
    ...req.body,
    line_id: req.body.line_id !== undefined ? Number(req.body.line_id) : undefined,
    target_shot: req.body.target_shot !== undefined ? Number(req.body.target_shot) : undefined,
  };
  const { valid, errors } = validateCreatePart(body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await partService.createPart(body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

const update = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.line_id !== undefined) body.line_id = Number(body.line_id);
  if (body.target_shot !== undefined) body.target_shot = Number(body.target_shot);

  const { valid, errors } = validateUpdatePart(body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await partService.updatePart(Number(req.params.id), body, req.user.id);
  res.status(200).json({ success: true, message: 'Success', data });
});

const remove = asyncHandler(async (req, res) => {
  await partService.deletePart(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: 'Success' });
});

module.exports = { list, create, update, remove };
