// src/controllers/auditLogController.js
const auditLogService = require('../services/auditLogService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const { table_name, user_id, date_from, date_to, page, limit } = req.query;
  const data = await auditLogService.listAuditLog({
    tableName: table_name,
    userId: user_id ? Number(user_id) : undefined,
    dateFrom: date_from,
    dateTo: date_to,
    page,
    limit,
  });
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = { list };
