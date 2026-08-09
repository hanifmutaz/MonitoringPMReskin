const db = require('../config/db');

const COUNTER_CTE = `
  WITH part_last_ganti AS (
    SELECT part_id, MAX(tgl_ganti) AS last_tgl_ganti
    FROM pm_part_history
    GROUP BY part_id
  ),
  part_counter AS (
    SELECT m.part_id, COALESCE(SUM(pc.output_actual), 0) AS counter
    FROM part_cl_mapping m
    JOIN parts p ON p.id = m.part_id
    JOIN part_last_ganti plg ON plg.part_id = m.part_id
    JOIN production_cache pc
      ON pc.line_id = p.line_id
     AND pc.cl_no = m.cl_no
     AND pc.tanggal >= plg.last_tgl_ganti
    GROUP BY m.part_id
  )
`;

async function findAllWithCounter({ lineId, search, limit, offset } = {}, runner = db) {
  const conditions = ['p.is_active = TRUE'];
  const params = [];

  if (lineId) {
    params.push(lineId);
    conditions.push(`p.line_id = $${params.length}`);
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
    `${COUNTER_CTE}
     SELECT
       p.id AS part_id, p.line_id, l.line_name, p.jig_name, p.drawing_no, p.part_name, p.target_shot,
       COALESCE(pcnt.counter, 0) AS counter,
       plg.last_tgl_ganti,
       (SELECT s.supplier_name FROM part_suppliers ps JOIN suppliers s ON s.id = ps.supplier_id
        WHERE ps.part_id = p.id AND ps.is_primary = TRUE LIMIT 1) AS primary_supplier_name
     FROM parts p
     JOIN lines l ON l.id = p.line_id
     LEFT JOIN part_counter pcnt ON pcnt.part_id = p.id
     LEFT JOIN part_last_ganti plg ON plg.part_id = p.id
     ${where}
     ORDER BY l.line_name ASC, p.jig_name ASC, p.drawing_no ASC
     ${limitOffsetClause}`,
    params
  );

  return result.rows;
}

/**
 * Hitung total part aktif yang match filter lineId/search (TANPA status —
 * lihat catatan di findAllWithCounter soal kenapa status tidak bisa masuk
 * sini). Dipakai untuk metadata pagination di jalur "tanpa filter status".
 */
async function countAll({ lineId, search } = {}, runner = db) {
  const conditions = ['p.is_active = TRUE'];
  const params = [];

  if (lineId) {
    params.push(lineId);
    conditions.push(`p.line_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.part_name ILIKE $${params.length} OR p.drawing_no ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const result = await runner.query(`SELECT COUNT(*)::int AS total FROM parts p ${where}`, params);
  return result.rows[0].total;
}

/**
 * Detail 1 part + counter (dipakai GET /pm-part/:partId).
 */
async function findOneWithCounter(partId, runner = db) {
  const result = await runner.query(
    `${COUNTER_CTE}
     SELECT
       p.id AS part_id, p.line_id, l.line_name, p.jig_name, p.drawing_no, p.part_name, p.target_shot,
       COALESCE(pcnt.counter, 0) AS counter,
       plg.last_tgl_ganti,
       (SELECT s.supplier_name FROM part_suppliers ps JOIN suppliers s ON s.id = ps.supplier_id
        WHERE ps.part_id = p.id AND ps.is_primary = TRUE LIMIT 1) AS primary_supplier_name
     FROM parts p
     JOIN lines l ON l.id = p.line_id
     LEFT JOIN part_counter pcnt ON pcnt.part_id = p.id
     LEFT JOIN part_last_ganti plg ON plg.part_id = p.id
     WHERE p.id = $1`,
    [partId]
  );
  return result.rows[0] || null;
}

/**
 * 5 riwayat penggantian terakhir untuk 1 part (dipakai di detail).
 */
async function findRecentHistory(partId, limit = 5, runner = db) {
  const result = await runner.query(
    `SELECT h.id, h.tgl_ganti, h.shift, h.counter_saat_diganti, h.jenis_penggantian, h.remark,
            u.full_name AS user_full_name
     FROM pm_part_history h
     JOIN users u ON u.id = h.user_id
     WHERE h.part_id = $1
     ORDER BY h.tgl_ganti DESC, h.id DESC
     LIMIT $2`,
    [partId, limit]
  );
  return result.rows;
}

module.exports = { findAllWithCounter, countAll, findOneWithCounter, findRecentHistory };