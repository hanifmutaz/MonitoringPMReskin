// src/utils/auditLog.js

const db = require('../config/db');

/**
 * @param {object} params
 * @param {string} params.tableName
 * @param {number|null} params.recordId
 * @param {'CREATE'|'UPDATE'|'DELETE'} params.action
 * @param {object|null} [params.oldValue]
 * @param {object|null} [params.newValue]
 * @param {number|null} params.userId
 * @param {string|null} [params.actionDetail] - ringkasan human-readable opsional (SECURITY_REVIEW.md Finding #5)
 * @param {import('pg').PoolClient} [client] - opsional, kalau dipanggil dalam transaksi
 */
async function recordAudit(params, client) {
  const { tableName, recordId, action, oldValue = null, newValue = null, userId, actionDetail = null } = params;

  const runner = client || db;

  await runner.query(
    `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, user_id, action_detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      tableName,
      recordId,
      action,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      userId,
      actionDetail,
    ]
  );
}

module.exports = { recordAudit };