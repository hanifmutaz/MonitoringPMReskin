// src/sql/notificationQueries.js
const db = require('../config/db');

async function findLastSent(notificationType, refId, runner = db) {
  const result = await runner.query(
    `SELECT * FROM notification_log
     WHERE notification_type = $1 AND ref_id = $2 AND status = 'SENT'
     ORDER BY sent_at DESC LIMIT 1`,
    [notificationType, refId]
  );
  return result.rows[0] || null;
}

async function insertLog({ notification_type, ref_id, recipients, status, error_message }, runner = db) {
  const result = await runner.query(
    `INSERT INTO notification_log (notification_type, ref_id, recipients, status, error_message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, notification_type, ref_id, recipients, status, error_message, sent_at`,
    [notification_type, ref_id, (recipients || []).join(','), status, error_message || null]
  );
  return result.rows[0];
}

async function findRecentByType(notificationType, { page = 1, limit = 20 } = {}, runner = db) {
  const offset = (Number(page) - 1) * Number(limit);
  const countResult = await runner.query(`SELECT COUNT(*)::int AS total FROM notification_log WHERE notification_type = $1`, [
    notificationType,
  ]);
  const dataResult = await runner.query(
    `SELECT * FROM notification_log WHERE notification_type = $1 ORDER BY sent_at DESC LIMIT $2 OFFSET $3`,
    [notificationType, Number(limit), offset]
  );
  return { items: dataResult.rows, total: countResult.rows[0].total, page: Number(page), limit: Number(limit) };
}

module.exports = { findLastSent, insertLog, findRecentByType };
