// src/sql/pmPartStatusSnapshotQueries.js
//
// Query MURNI (Development Rules §7 - tidak ada business logic di sini).
// Formula status/threshold tetap sepenuhnya di pmPartService.computeMetrics()
// - modul ini cuma nulis hasilnya ke snapshot dan bacanya balik.
// Lihat migration 1700000021000 untuk latar belakang lengkap.

const db = require('../config/db');

/**
 * Tulis ulang seluruh snapshot dalam 1 transaksi (full recompute,
 * idempotent - konsisten dengan pola ADR 006). Baris untuk part yang
 * sudah tidak aktif/tidak ada lagi di `metrics` otomatis hilang karena
 * TRUNCATE, bukan di-DELETE manual satu-satu.
 *
 * @param {Array} metrics - hasil pmPartService.getAllComputedMetrics()
 *   (array of { part_id, line_id, counter, remaining_shot, usage_per_day,
 *   estimated_pm_date, status, wear_percentage } - field display seperti
 *   line_name/part_name SENGAJA tidak disimpan di sini, dibaca ulang dari
 *   `parts`/`lines` saat query supaya tidak ada data ganda yang bisa basi
 *   kalau part di-rename).
 */
async function replaceAll(metrics) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE pm_part_status_snapshot');

    if (metrics.length > 0) {
      const values = [];
      const params = [];
      metrics.forEach((m, i) => {
        const base = i * 9;
        values.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`
        );
        params.push(
          m.part_id,
          m.line_id,
          m.counter,
          m.remaining_shot,
          m.usage_per_day,
          m.estimated_pm_date,
          m.status,
          m.wear_percentage,
          m.last_tgl_ganti || null
        );
      });

      await client.query(
        `INSERT INTO pm_part_status_snapshot
           (part_id, line_id, counter, remaining_shot, usage_per_day, estimated_pm_date, status, wear_percentage, last_tgl_ganti)
         VALUES ${values.join(', ')}`,
        params
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Baca snapshot dengan filter status (WAJIB), opsional lineId/search,
 * paginated di level SQL. Dipakai listPmPart() saat status diisi.
 */
async function findByStatus({ status, lineId, search, limit, offset }, runner = db) {
  const conditions = ['s.status = $1'];
  const params = [status];

  if (lineId) {
    params.push(lineId);
    conditions.push(`s.line_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.part_name ILIKE $${params.length} OR p.drawing_no ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  let limitOffsetClause = '';
  if (Number.isInteger(limit) && Number.isInteger(offset)) {
    params.push(limit);
    limitOffsetClause += ` LIMIT $${params.length}`;
    params.push(offset);
    limitOffsetClause += ` OFFSET $${params.length}`;
  }

  const result = await runner.query(
    `SELECT
       s.part_id, s.line_id, l.line_name, p.jig_name, p.drawing_no, p.part_name, p.target_shot,
       s.counter, s.remaining_shot, s.usage_per_day, s.estimated_pm_date, s.status, s.wear_percentage,
       s.last_tgl_ganti, s.computed_at,
       (SELECT sup.supplier_name FROM part_suppliers ps JOIN suppliers sup ON sup.id = ps.supplier_id
        WHERE ps.part_id = p.id AND ps.is_primary = TRUE LIMIT 1) AS primary_supplier_name
     FROM pm_part_status_snapshot s
     JOIN parts p ON p.id = s.part_id AND p.is_active = TRUE
     JOIN lines l ON l.id = s.line_id
     ${where}
     ORDER BY l.line_name ASC, p.jig_name ASC, p.drawing_no ASC
     ${limitOffsetClause}`,
    params
  );

  return result.rows;
}

async function countByStatus({ status, lineId, search }, runner = db) {
  const conditions = ['s.status = $1'];
  const params = [status];

  if (lineId) {
    params.push(lineId);
    conditions.push(`s.line_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.part_name ILIKE $${params.length} OR p.drawing_no ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const result = await runner.query(
    `SELECT COUNT(*)::int AS total
     FROM pm_part_status_snapshot s
     JOIN parts p ON p.id = s.part_id AND p.is_active = TRUE
     ${where}`,
    params
  );
  return result.rows[0].total;
}

/**
 * Dipakai job/health-check buat deteksi snapshot yang telat/berhenti
 * ter-refresh (mis. kalau kredensial ConMas belum diisi - lihat
 * conmasSyncService.runSync() yang skip diam-diam kalau belum configured).
 */
async function getOldestComputedAt(runner = db) {
  const result = await runner.query(`SELECT MIN(computed_at) AS oldest_computed_at FROM pm_part_status_snapshot`);
  return result.rows[0].oldest_computed_at;
}

module.exports = { replaceAll, findByStatus, countByStatus, getOldestComputedAt };
