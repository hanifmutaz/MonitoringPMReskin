// src/controllers/pmLineController.js
const pmLineService = require('../services/pmLineService');
const asyncHandler = require('../utils/asyncHandler');

const status = asyncHandler(async (req, res) => {
  const { line_id } = req.query;
  const data = await pmLineService.getPmLineStatus({ lineId: line_id ? Number(line_id) : undefined });
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { status };
