const db = require('../config/db');

/**
 * PENTING (perf): `filtered_parts` HARUS jadi CTE pertama dan semua CTE
 * turunan (part_last_ganti, part_counter) JOIN ke situ, bukan langsung ke
 * `parts`. Alasan: `part_last_ganti` dipakai 2x di query akhir (sekali di
 * dalam part_counter, sekali di outer join buat kolom last_tgl_ganti) —
 * begitu sebuah CTE direferensikan >1x, Postgres (12+) memperlakukannya
 * seolah MATERIALIZED, yaitu DIHITUNG PENUH DULU sebelum filter luar
 * diterapkan. Kalau filter (line_id/search/id) cuma ada di WHERE outer,
 * Postgres akan tetap agregasi counter untuk SEMUA part di SEMUA line dulu
 * (join ke seluruh production_cache), baru buang sisanya belakangan —
 * lambat drastis begitu production_cache tumbuh (measured: ~11 detik untuk
 * 1 line di 1.3 juta row production_cache, vs ~55ms setelah filter
 * didorong ke sini). Kalau nambah CTE baru di sini, filter dulu lewat
 * filtered_parts, jangan filter belakangan di WHERE outer.
 */
function buildCounterCte(filteredPartsSelect) {
  return `
  WITH filtered_parts AS (
    ${filteredPartsSelect}
  ),
  part_last_ganti AS (
    SELECT h.part_id, MAX(h.tgl_ganti) AS last_tgl_ganti
    FROM pm_part_history h
    JOIN filtered_parts fp ON fp.id = h.part_id
    WHERE h.deleted_at IS NULL
    GROUP BY h.part_id
  ),
  part_counter AS (
    SELECT m.part_id, COALESCE(SUM(pc.output_actual), 0) AS counter
    FROM part_cl_mapping m
    JOIN filtered_parts fp ON fp.id = m.part_id
    JOIN part_last_ganti plg ON plg.part_id = m.part_id
    JOIN production_cache pc
      ON pc.line_id = fp.line_id
     AND pc.cl_no = m.cl_no
     AND pc.tanggal >= plg.last_tgl_ganti
    GROUP BY m.part_id
  )
  `;
}

const FINAL_SELECT = `
  SELECT
    fp.id AS part_id, fp.line_id, l.line_name, fp.jig_name, fp.drawing_no, fp.part_name, fp.target_shot,
    COALESCE(pcnt.counter, 0) AS counter,
    plg.last_tgl_ganti,
    (SELECT s.supplier_name FROM part_suppliers ps JOIN suppliers s ON s.id = ps.supplier_id
     WHERE ps.part_id = fp.id AND ps.is_primary = TRUE LIMIT 1) AS primary_supplier_name
  FROM filtered_parts fp
  JOIN lines l ON l.id = fp.line_id
  LEFT JOIN part_counter pcnt ON pcnt.part_id = fp.id
  LEFT JOIN part_last_ganti plg ON plg.part_id = fp.id
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

  const filteredPartsSelect = `
    SELECT p.id, p.line_id, p.jig_name, p.drawing_no, p.part_name, p.target_shot
    FROM parts p
    ${where}
  `;

  const result = await runner.query(
    `${buildCounterCte(filteredPartsSelect)}
     ${FINAL_SELECT}
     ORDER BY l.line_name ASC, fp.jig_name ASC, fp.drawing_no ASC
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
  const filteredPartsSelect = `
    SELECT p.id, p.line_id, p.jig_name, p.drawing_no, p.part_name, p.target_shot
    FROM parts p
    WHERE p.id = $1
  `;

  const result = await runner.query(
    `${buildCounterCte(filteredPartsSelect)}
     ${FINAL_SELECT}`,
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
     WHERE h.part_id = $1 AND h.deleted_at IS NULL
     ORDER BY h.tgl_ganti DESC, h.id DESC
     LIMIT $2`,
    [partId, limit]
  );
  return result.rows;
}

module.exports = { findAllWithCounter, countAll, findOneWithCounter, findRecentHistory };
