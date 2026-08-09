// src/sql/productionCacheQueries.js
const db = require('../config/db');

/**
 * Upsert 1 batch baris ke production_cache. UNIQUE(line_id, cl_no, tanggal)
 * di skema mencegah duplikat kalau sync job jalan berkali-kali (lihat
 * komentar di 04_DATABASE_SCHEMA.sql).
 */
async function upsertBatch(rows, runner = db) {
  for (const row of rows) {
    await runner.query(
      `INSERT INTO production_cache (line_id, cl_no, tanggal, output_actual, synced_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (line_id, cl_no, tanggal)
       DO UPDATE SET output_actual = EXCLUDED.output_actual, synced_at = now()`,
      [row.line_id, row.cl_no, row.tanggal, row.output_actual]
    );
  }
}

module.exports = { upsertBatch };
