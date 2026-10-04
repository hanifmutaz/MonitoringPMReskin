// src/controllers/auditLogController.js
const auditLogService = require('../services/auditLogService');
const historyExportService = require('../services/historyExportService');
const { sendXlsx } = require('../utils/xlsxExport');
const { parseDateRange } = require('../utils/dateRange');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { table_name, user_id, page, limit } = req.query;
  const { dateFrom, dateTo } = parseDateRange(req.query);
  const data = await auditLogService.listAuditLog({
    tableName: table_name,
    userId: user_id ? Number(user_id) : undefined,
    dateFrom,
    dateTo,
    page,
    limit,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

// GET /audit-log/export - filter sama dengan list, tanpa pagination.
const exportXlsx = asyncHandler(async (req, res) => {
  const { table_name, user_id } = req.query;
  const { dateFrom, dateTo } = parseDateRange(req.query);
  const { buffer, filename } = await historyExportService.exportAuditLog({
    tableName: table_name,
    userId: user_id ? Number(user_id) : undefined,
    dateFrom,
    dateTo,
  });
  sendXlsx(res, buffer, filename);
});

module.exports = { list, exportXlsx };
