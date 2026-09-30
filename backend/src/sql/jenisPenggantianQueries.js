// src/sql/jenisPenggantianQueries.js
const db = require('../config/db');

const COLUMNS = 'id, code, label, counts_in_ketepatan, is_active, sort_order, created_at';

async function findAll({ isActive } = {}, runner = db) {
  const params = [];
  let where = '';
  if (isActive !== undefined) {
    params.push(isActive);
    where = `WHERE is_active = $1`;
  }
  const result = await runner.query(
    `SELECT ${COLUMNS} FROM jenis_penggantian ${where} ORDER BY sort_order ASC, id ASC`,
    params
  );
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`SELECT ${COLUMNS} FROM jenis_penggantian WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function findByCode(code, runner = db) {
  const result = await runner.query(`SELECT ${COLUMNS} FROM jenis_penggantian WHERE code = $1`, [code]);
  return result.rows[0] || null;
}

async function create({ code, label, counts_in_ketepatan }, runner = db) {
  const result = await runner.query(
    `INSERT INTO jenis_penggantian (code, label, counts_in_ketepatan, sort_order)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) FROM jenis_penggantian), 0) + 10)
     RETURNING ${COLUMNS}`,
    [code, label, counts_in_ketepatan]
  );
  return result.rows[0];
}

async function update(id, { label, counts_in_ketepatan, is_active }, runner = db) {
  const result = await runner.query(
    `UPDATE jenis_penggantian
        SET label = COALESCE($2, label),
            counts_in_ketepatan = COALESCE($3, counts_in_ketepatan),
            is_active = COALESCE($4, is_active)
      WHERE id = $1
      RETURNING ${COLUMNS}`,
    [id, label ?? null, counts_in_ketepatan ?? null, is_active ?? null]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById, findByCode, create, update };
