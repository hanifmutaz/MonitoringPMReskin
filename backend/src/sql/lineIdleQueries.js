// src/sql/lineIdleQueries.js
const db = require('../config/db');

/**
 * Satu baris per Line aktif: tanggal running terakhir (ada output > 0 di
 * production_cache), tanggal Line dibuat (fallback), dan cleaning terakhir.
 */
async function findLineActivity(runner = db) {
  const result = await runner.query(
    `SELECT l.id AS line_id,
            l.line_name,
            l.created_at::date::text AS created_date,
            (SELECT MAX(pc.tanggal) FROM production_cache pc
              WHERE pc.line_id = l.id AND pc.output_actual > 0) AS last_run_date,
            (SELECT MAX(c.tgl_cleaning) FROM line_cleaning_history c
              WHERE c.line_id = l.id) AS last_cleaning_date
     FROM lines l
     WHERE l.is_active = TRUE AND l.deleted_at IS NULL
     ORDER BY l.line_name ASC`
  );
  return result.rows;
}

/** Total output per tanggal untuk 1 Line, N hari terakhir (dipakai evidence keterlambatan). */
async function findDailyOutput({ lineId, dateFrom }, runner = db) {
  const result = await runner.query(
    `SELECT tanggal, SUM(output_actual)::bigint AS output
     FROM production_cache
     WHERE line_id = $1 AND tanggal >= $2
     GROUP BY tanggal
     ORDER BY tanggal ASC`,
    [lineId, dateFrom]
  );
  return result.rows.map((r) => ({ tanggal: r.tanggal, output: Number(r.output) }));
}

async function createCleaning(data, runner = db) {
  const result = await runner.query(
    `INSERT INTO line_cleaning_history (line_id, tgl_cleaning, pic_name, keterangan, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, line_id, tgl_cleaning, pic_name, keterangan, user_id, created_at`,
    [data.line_id, data.tgl_cleaning, data.pic_name, data.keterangan ?? null, data.user_id]
  );
  return result.rows[0];
}

async function findCleaningByLine({ lineId, limit = 20 }, runner = db) {
  const result = await runner.query(
    `SELECT c.id, c.line_id, c.tgl_cleaning, c.pic_name, c.keterangan,
            u.full_name AS user_full_name, c.created_at
     FROM line_cleaning_history c
     JOIN users u ON u.id = c.user_id
     WHERE c.line_id = $1
     ORDER BY c.tgl_cleaning DESC, c.id DESC
     LIMIT $2`,
    [lineId, limit]
  );
  return result.rows;
}

module.exports = { findLineActivity, findDailyOutput, createCleaning, findCleaningByLine };
