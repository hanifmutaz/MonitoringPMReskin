// src/controllers/pmLineController.js
const pmLineService = require('../services/pmLineService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { validateUpdateLastPmDate } = require('../validators/pmLineHistoryValidator');

const status = asyncHandler(async (req, res) => {
  const { line_id } = req.query;
  const data = await pmLineService.getPmLineStatus({ lineId: line_id ? Number(line_id) : undefined });
  res.status(200).json({ success: true, message: 'Success', data });
});

const updateLastDate = asyncHandler(async (req, res) => {
  const lineId = Number(req.params.lineId);
  if (!Number.isInteger(lineId)) throw AppError.badRequest('Validasi gagal', { line_id: 'Line ID tidak valid' });

  const { valid, errors } = validateUpdateLastPmDate(req.body);
  if (!valid) throw AppError.badRequest('Validasi gagal', errors);

  const data = await pmLineService.updateLastPmDate({
    lineId,
    jenisPm: req.body.jenis_pm,
    tgl: req.body.tgl,
    alasan: req.body.alasan,
    userId: req.user.id,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { status, updateLastDate };
