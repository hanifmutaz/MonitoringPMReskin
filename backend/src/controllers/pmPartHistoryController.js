// src/controllers/pmPartHistoryController.js
const pmPartHistoryService = require('../services/pmPartHistoryService');
const { validateCreateHistory } = require('../validators/pmPartHistoryValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const { line_id, part_id, jenis, date_from, date_to, page, limit } = req.query;
  const data = await pmPartHistoryService.listHistory({
    lineId: line_id ? Number(line_id) : undefined,
    partId: part_id ? Number(part_id) : undefined,
    jenis,
    dateFrom: date_from,
    dateTo: date_to,
    page,
    limit,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

const create = asyncHandler(async (req, res) => {
  const body = {
    ...req.body,
    part_id: req.body.part_id !== undefined ? Number(req.body.part_id) : undefined,
    shift: req.body.shift !== undefined ? Number(req.body.shift) : undefined,
    counter_saat_diganti:
      req.body.counter_saat_diganti !== undefined ? Number(req.body.counter_saat_diganti) : undefined,
  };

  const { valid, errors } = validateCreateHistory(body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await pmPartHistoryService.createHistory(body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

module.exports = { list, create };
