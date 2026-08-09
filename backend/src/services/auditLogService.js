// src/services/auditLogService.js
const auditLogQueries = require('../sql/auditLogQueries');

async function listAuditLog({ tableName, userId, dateFrom, dateTo, page, limit }) {
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 20;
  return auditLogQueries.findAll({ tableName, userId, dateFrom, dateTo, page: pageNum, limit: limitNum });
}

module.exports = { listAuditLog };
