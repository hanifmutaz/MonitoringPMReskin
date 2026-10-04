// src/sql/auditLogQueries.js
//
// FIX (docs/frontend/MIGRATION-PLAN.md Phase 11, saat bangun halaman Audit
// Log): `action_detail` (migration 1700000004000, SECURITY_REVIEW.md
// Finding #5 - ringkasan human-readable spt "Role diubah: Operator ->
// Supervisor") DITULIS oleh recordAudit() tapi TIDAK PERNAH di-SELECT
// balik di sini - genuine gap, bukan sengaja. Ditambahkan sekarang karena
// halaman Audit Log baru butuh field ini buat ditampilkan; sebelumnya
// gak ada consumer yang baca kolom ini sama sekali jadi gap-nya gak
// kelihatan.
const db = require('../config/db');
const { addTimestampRange } = require('../utils/dateRange');

const LIST_SELECT = `
  SELECT a.id, a.table_name, a.record_id, a.action, a.action_detail, a.old_value, a.new_value,
         a.user_id, u.username AS user_username, u.full_name AS user_full_name, a.created_at
  FROM audit_log a
  LEFT JOIN users u ON u.id = a.user_id
`;

async function findAll({ tableName, userId, dateFrom, dateTo, page = 1, limit = 20 } = {}, runner = db) {
  const conditions = [];
  const params = [];

  if (tableName) {
    params.push(tableName);
    conditions.push(`a.table_name = $${params.length}`);
  }
  if (userId) {
    params.push(userId);
    conditions.push(`a.user_id = $${params.length}`);
  }
  addTimestampRange(conditions, params, 'a.created_at', dateFrom, dateTo);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const itemsResult = await runner.query(
    `${LIST_SELECT} ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`,
    [...params, limit, offset]
  );
  const countResult = await runner.query(`SELECT COUNT(*)::int AS total FROM audit_log a ${where}`, params);

  return { items: itemsResult.rows, total: countResult.rows[0].total, page, limit };
}

/**
 * Semua baris yang cocok filter (tanpa pagination) buat export; maxRows = cap+1.
 * Sengaja TIDAK menyertakan old_value/new_value (JSON snapshot mentah): bisa
 * berisi data sensitif & tidak terbaca di Excel. Ringkasannya sudah ada di
 * action_detail; detail lengkap tetap bisa dibuka di halaman Audit Log.
 */
async function findAllForExport({ tableName, userId, dateFrom, dateTo, maxRows } = {}, runner = db) {
  const conditions = [];
  const params = [];

  if (tableName) {
    params.push(tableName);
    conditions.push(`a.table_name = $${params.length}`);
  }
  if (userId) {
    params.push(userId);
    conditions.push(`a.user_id = $${params.length}`);
  }
  addTimestampRange(conditions, params, 'a.created_at', dateFrom, dateTo);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitSql = maxRows ? ` LIMIT ${Number(maxRows)}` : '';
  const result = await runner.query(
    `SELECT a.id, a.table_name, a.record_id, a.action, a.action_detail,
            u.username AS user_username, u.full_name AS user_full_name, a.created_at
     FROM audit_log a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC, a.id DESC${limitSql}`,
    params
  );
  return result.rows;
}

module.exports = { findAll, findAllForExport };
