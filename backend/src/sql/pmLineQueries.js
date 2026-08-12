// src/sql/pmLineQueries.js
const db = require('../config/db');

/**
 * Pastikan setiap Line punya 1 baris pm_monthly_helper (relasi 1:1 sesuai
 * ER Diagram MASTER DOCUMENT Bagian 3). Idempotent — dipanggil lazily saat
 * dibutuhkan, bukan trigger DB (konsisten dengan pola Service layer yang
 * dipakai di seluruh project).
 */
async function ensureHelperExists(lineId, runner = db) {
  await runner.query(
    `INSERT INTO pm_monthly_helper (line_id) VALUES ($1)
     ON CONFLICT (line_id) DO NOTHING`,
    [lineId]
  );
}

const STATUS_SELECT = `
  SELECT
    l.id AS line_id, l.line_name, l.auto_reset_weekly_on_monthly AS line_override,
    h.tgl_pm_monthly_terakhir, h.tgl_pm_weekly_terakhir, h.akumulasi_poin_monthly
  FROM lines l
  JOIN pm_monthly_helper h ON h.line_id = l.id
`;

async function findAllStatus({ lineId } = {}, runner = db) {
  const conditions = ['l.is_active = TRUE', 'l.deleted_at IS NULL'];
  const params = [];
  if (lineId) {
    params.push(lineId);
    conditions.push(`l.id = $${params.length}`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const result = await runner.query(`${STATUS_SELECT} ${where} ORDER BY l.line_name ASC`, params);
  return result.rows;
}

async function findLineById(lineId, runner = db) {
  const result = await runner.query(
    `SELECT id, line_name, is_active, auto_reset_weekly_on_monthly FROM lines WHERE id = $1 AND deleted_at IS NULL`,
    [lineId]
  );
  return result.rows[0] || null;
}

async function findHelperByLine(lineId, runner = db) {
  const result = await runner.query(`SELECT * FROM pm_monthly_helper WHERE line_id = $1`, [lineId]);
  return result.rows[0] || null;
}

async function updateHelper(lineId, fields, runner = db) {
  const setClauses = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    setClauses.push(`${key} = $${params.length}`);
  }
  setClauses.push('updated_at = now()');
  params.push(lineId);

  const result = await runner.query(
    `UPDATE pm_monthly_helper SET ${setClauses.join(', ')} WHERE line_id = $${params.length}
     RETURNING *`,
    params
  );
  return result.rows[0];
}

module.exports = { ensureHelperExists, findAllStatus, findLineById, findHelperByLine, updateHelper };