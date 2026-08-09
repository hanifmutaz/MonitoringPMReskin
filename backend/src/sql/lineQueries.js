// src/sql/lineQueries.js
const db = require('../config/db');

const BASE_SELECT = `
  SELECT id, line_name, is_active, auto_reset_weekly_on_monthly, created_at
  FROM lines
`;

async function findAll({ isActive } = {}, runner = db) {
  const conditions = [];
  const params = [];

  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await runner.query(`${BASE_SELECT} ${where} ORDER BY line_name ASC`, params);
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`${BASE_SELECT} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function findByName(lineName, runner = db) {
  const result = await runner.query(`SELECT id FROM lines WHERE line_name = $1`, [lineName]);
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

async function remove(id, runner = db) {
  await runner.query(`DELETE FROM lines WHERE id = $1`, [id]);
}

async function countPartsByLine(id, runner = db) {
  const result = await runner.query(`SELECT COUNT(*)::int AS count FROM parts WHERE line_id = $1`, [id]);
  return result.rows[0].count;
}

module.exports = { findAll, findById, findByName, create, update, remove, countPartsByLine };
