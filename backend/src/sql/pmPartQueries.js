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
  -- Baseline mulai hitung Counter. Dua mode:
  --  (a) MODE OFFSET (counter_awal): Part punya counter_awal_tanggal DAN belum
  --      ada riwayat penggantian SESUDAH tanggal itu. Counter = counter_awal +
  --      produksi dengan tanggal > counter_awal_tanggal (counter_awal dianggap
  --      posisi akhir hari cutoff, jadi hari cutoff sendiri TIDAK dihitung lagi
  --      supaya tidak dobel). Lihat migration 1700000026000.
  --  (b) MODE LAMA: MAX(tgl_ganti) kalau ADA riwayat, atau fallback ke
  --      tgl_pasang_awal kalau BELUM PERNAH diganti (migration 1700000025000).
  --      Produksi dihitung tanggal >= baseline (perilaku lama, tidak diubah).
  -- count_from = tanggal pertama produksi yang ikut dijumlahkan.
  -- usage_start_date = titik awal buat hitung Pemakaian/Hari (tanpa counter_awal).
  part_baseline AS (
    SELECT
      fp.id AS part_id,
      COALESCE(plg.last_tgl_ganti, fp.tgl_pasang_awal) AS baseline_date,
      (fp.counter_awal_tanggal IS NOT NULL
        AND (plg.last_tgl_ganti IS NULL OR plg.last_tgl_ganti <= fp.counter_awal_tanggal)) AS use_offset,
      CASE
        WHEN fp.counter_awal_tanggal IS NOT NULL
         AND (plg.last_tgl_ganti IS NULL OR plg.last_tgl_ganti <= fp.counter_awal_tanggal)
          THEN fp.counter_awal_tanggal + 1
        ELSE COALESCE(plg.last_tgl_ganti, fp.tgl_pasang_awal)
      END AS count_from,
      CASE
        WHEN fp.counter_awal_tanggal IS NOT NULL
         AND (plg.last_tgl_ganti IS NULL OR plg.last_tgl_ganti <= fp.counter_awal_tanggal)
          THEN fp.counter_awal_tanggal
        ELSE COALESCE(plg.last_tgl_ganti, fp.tgl_pasang_awal)
      END AS usage_start_date
    FROM filtered_parts fp
    LEFT JOIN part_last_ganti plg ON plg.part_id = fp.id
  ),
  part_counter AS (
    SELECT m.part_id, COALESCE(SUM(pc.output_actual), 0) AS counter
    FROM part_cl_mapping m
    JOIN filtered_parts fp ON fp.id = m.part_id
    JOIN part_baseline pb ON pb.part_id = m.part_id AND pb.count_from IS NOT NULL
    JOIN production_cache pc
      ON pc.line_id = fp.line_id
     AND pc.cl_no = m.cl_no
     AND pc.tanggal >= pb.count_from
    GROUP BY m.part_id
  )
  `;
}

const FINAL_SELECT = `
  SELECT
    fp.id AS part_id, fp.line_id, l.line_name, fp.jig_name, fp.drawing_no, fp.part_name, fp.target_shot,
    -- counter = produksi sejak count_from + counter_awal (hanya mode offset).
    -- counter_awal_applied & usage_start_date dipakai computeMetrics supaya
    -- Pemakaian/Hari dihitung dari produksi nyata saja (bukan dari offset).
    COALESCE(pcnt.counter, 0) + CASE WHEN pb.use_offset THEN COALESCE(fp.counter_awal, 0) ELSE 0 END AS counter,
    CASE WHEN pb.use_offset THEN COALESCE(fp.counter_awal, 0) ELSE 0 END AS counter_awal_applied,
    pb.usage_start_date,
    -- last_tgl_ganti di response TETAP pakai nama ini (bukan diganti jadi
    -- "baseline_date") supaya pmPartService.computeMetrics() dan field API
    -- yang sudah ada (last_tgl_ganti) tidak perlu berubah - nilainya SEKARANG
    -- sudah termasuk fallback tgl_pasang_awal lewat part_baseline.
    pb.baseline_date AS last_tgl_ganti,
    (SELECT s.supplier_name FROM part_suppliers ps JOIN suppliers s ON s.id = ps.supplier_id
     WHERE ps.part_id = fp.id AND ps.is_primary = TRUE LIMIT 1) AS primary_supplier_name
  FROM filtered_parts fp
  JOIN lines l ON l.id = fp.line_id
  LEFT JOIN part_counter pcnt ON pcnt.part_id = fp.id
  LEFT JOIN part_baseline pb ON pb.part_id = fp.id
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
    SELECT p.id, p.line_id, p.jig_name, p.drawing_no, p.part_name, p.target_shot, p.tgl_pasang_awal,
           p.counter_awal, p.counter_awal_tanggal
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
    SELECT p.id, p.line_id, p.jig_name, p.drawing_no, p.part_name, p.target_shot, p.tgl_pasang_awal,
           p.counter_awal, p.counter_awal_tanggal
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
