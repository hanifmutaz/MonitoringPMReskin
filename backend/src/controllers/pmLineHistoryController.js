// src/controllers/pmLineHistoryController.js
const pmLineHistoryService = require('../services/pmLineHistoryService');
const { validateCreatePmLineHistory } = require('../validators/pmLineHistoryValidator');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const { line_id, jenis, date_from, date_to, page, limit } = req.query;
  const data = await pmLineHistoryService.listPmLineHistory({
    lineId: line_id ? Number(line_id) : undefined,
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
    line_id: req.body.line_id !== undefined ? Number(req.body.line_id) : undefined,
  };

  const { valid, errors } = validateCreatePmLineHistory(body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await pmLineHistoryService.submitPmLineHistory(body, req.user.id);
  res.status(201).json({ success: true, message: 'Success', data });
});

module.exports = { list, create };
