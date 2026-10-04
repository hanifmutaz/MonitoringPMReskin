// src/controllers/pmPartController.js
const pmPartService = require('../services/pmPartService');
const historyExportService = require('../services/historyExportService');
const { sendXlsx } = require('../utils/xlsxExport');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { line_id, status, search, page, limit } = req.query;
  const data = await pmPartService.listPmPart({
    lineId: line_id ? Number(line_id) : undefined,
    status,
    search,
    page,
    limit,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

// GET /pm-part/export - filter sama dengan list (line_id, status, search), tanpa pagination.
const exportXlsx = asyncHandler(async (req, res) => {
  const { line_id, status, search } = req.query;
  const { buffer, filename } = await historyExportService.exportPmPartMonitoring({
    lineId: line_id ? Number(line_id) : undefined,
    status,
    search,
  });
  sendXlsx(res, buffer, filename);
});

const detail = asyncHandler(async (req, res) => {
  const data = await pmPartService.getPmPartDetail(Number(req.params.partId));
  res.status(200).json({ success: true, message: 'Success', data });
});

const ketepatanPerLine = asyncHandler(async (req, res) => {
  const data = await pmPartService.getKetepatanPerLine();
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { list, detail, ketepatanPerLine, exportXlsx };
