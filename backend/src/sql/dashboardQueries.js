// src/sql/dashboardQueries.js
const db = require('../config/db');

async function countAllParts(runner = db) {
  const result = await runner.query(`SELECT COUNT(*)::int AS count FROM parts WHERE deleted_at IS NULL`);
  return result.rows[0].count;
}

async function countActiveLines(runner = db) {
  const result = await runner.query(
    `SELECT COUNT(*)::int AS count FROM lines WHERE is_active = TRUE AND deleted_at IS NULL`
  );
  return result.rows[0].count;
}

/**
 * Status sync production_cache terakhir. Adapter Sync ConMas (MASTER
 * DOCUMENT Fase 3) sudah dibangun (services/conmasSyncService.js +
 * jobs/conmasSyncJob.js), tapi belum ada tabel log job terpisah — jejak
 * yang tersedia masih dari kolom `synced_at` di production_cache sendiri.
 * Endpoint ini baca apa adanya dari situ; kalau nanti ditambah tabel log
 * job terpisah, endpoint ini bisa diarahkan ke situ tanpa breaking change
 * di kontrak response-nya.
 */
async function getLastSyncInfo(runner = db) {
  const result = await runner.query(
    `SELECT
       MAX(synced_at) AS last_synced_at,
       (SELECT COUNT(*)::int FROM production_cache WHERE synced_at = (SELECT MAX(synced_at) FROM production_cache)) AS rows_synced
     FROM production_cache`
  );
  return result.rows[0];
}

module.exports = { countAllParts, countActiveLines, getLastSyncInfo };