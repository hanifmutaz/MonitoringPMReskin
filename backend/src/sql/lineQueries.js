// src/sql/lineQueries.js
const db = require('../config/db');

const BASE_SELECT = `
  SELECT id, line_name, is_active, auto_reset_weekly_on_monthly, created_at
  FROM lines
`;

async function findAll({ isActive } = {}, runner = db) {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const result = await runner.query(`${BASE_SELECT} ${where} ORDER BY line_name ASC`, params);
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`${BASE_SELECT} WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return result.rows[0] || null;
}

// Dipakai buat cek keunikan line_name (create/update) - filter deleted_at
// IS NULL supaya nama Line yang sudah di-Recycle Bin bisa dipakai ulang
// (lihat migration 1700000017000, partial unique index uq_lines_line_name_active).
async function findByName(lineName, runner = db) {
  const result = await runner.query(`SELECT id FROM lines WHERE line_name = $1 AND deleted_at IS NULL`, [lineName]);
  return result.rows[0] || null;
}

async function create({ line_name, auto_reset_weekly_on_monthly = null }, runner = db) {
  const result = await runner.query(
    `INSERT INTO lines (line_name, auto_reset_weekly_on_monthly)
     VALUES ($1, $2)
     RETURNING id, line_name, is_active, auto_reset_weekly_on_monthly, created_at`,
    [line_name, auto_reset_weekly_on_monthly]
  );
  return result.rows[0];
}

async function update(id, fields, runner = db) {
  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    setClauses.push(`${key} = $${params.length}`);
  }
  params.push(id);

  const result = await runner.query(
    `UPDATE lines SET ${setClauses.join(', ')} WHERE id = $${params.length}
     RETURNING id, line_name, is_active, auto_reset_weekly_on_monthly, created_at`,
    params
  );
  return result.rows[0] || null;
}

// SOFT DELETE (checklist Recycle Bin) - GANTI dari hard DELETE. Row tetap
// ada secara fisik (deleted_at diisi), muncul di Recycle Bin, bisa
// direstore. Hard delete permanen cuma lewat recycleBinService.permanentDelete().
async function remove(id, userId, runner = db) {
  await runner.query(`UPDATE lines SET deleted_at = now(), deleted_by = $1 WHERE id = $2`, [userId, id]);
}

async function countPartsByLine(id, runner = db) {
  const result = await runner.query(
    `SELECT COUNT(*)::int AS count FROM parts WHERE line_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0].count;
}

module.exports = { findAll, findById, findByName, create, update, remove, countPartsByLine };
