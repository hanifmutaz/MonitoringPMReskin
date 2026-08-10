// src/sql/pmPartHistoryQueries.js
const db = require('../config/db');

const LIST_SELECT = `
  SELECT
    h.id, h.part_id, p.line_id, l.line_name, p.jig_name, p.drawing_no, p.part_name,
    h.tgl_ganti, h.shift, h.counter_saat_diganti, h.jenis_penggantian, h.remark, h.pic_name,
    h.on_time, h.user_id, u.full_name AS user_full_name, h.created_at
  FROM pm_part_history h
  JOIN parts p ON p.id = h.part_id
  JOIN lines l ON l.id = p.line_id
  JOIN users u ON u.id = h.user_id
`;

async function findAll({ lineId, partId, jenis, dateFrom, dateTo, page = 1, limit = 20 } = {}, runner = db) {
  const conditions = [];
  const params = [];

  if (lineId) {
    params.push(lineId);
    conditions.push(`p.line_id = $${params.length}`);
  }
  if (partId) {
    params.push(partId);
    conditions.push(`h.part_id = $${params.length}`);
  }
  if (jenis) {
    params.push(jenis);
    conditions.push(`h.jenis_penggantian = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`h.tgl_ganti >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`h.tgl_ganti <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const itemsResult = await runner.query(
    `${LIST_SELECT} ${where} ORDER BY h.tgl_ganti DESC, h.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2
    }`,
    [...params, limit, offset]
  );

  const countResult = await runner.query(
    `SELECT COUNT(*)::int AS total FROM pm_part_history h JOIN parts p ON p.id = h.part_id ${where}`,
    params
  );

  return { items: itemsResult.rows, total: countResult.rows[0].total, page, limit };
}

async function partExists(partId, runner = db) {
  const result = await runner.query(`SELECT id FROM parts WHERE id = $1`, [partId]);
  return !!result.rows[0];
}

/** Ambil target_shot part - dibutuhkan buat nentuin ketepatan (counter_saat_diganti vs target_shot) sebelum insert history. */
async function findPartTargetShot(partId, runner = db) {
  const result = await runner.query(`SELECT target_shot FROM parts WHERE id = $1`, [partId]);
  return result.rows[0] ? Number(result.rows[0].target_shot) : null;
}

// Ambil target_shot SEKALIGUS inventory_item_id + drawing_no - dipakai
// createHistory() buat nentuin ketepatan DAN apakah part ini perlu
// dikurangin stock inventory-nya (kalau sudah di-link). 1 query, dijalanin
// di client transaksi yang sama biar konsisten sama findPartTargetShot.
async function findPartForHistory(partId, runner = db) {
  const result = await runner.query(
    `SELECT target_shot, inventory_item_id, drawing_no FROM parts WHERE id = $1`,
    [partId]
  );
  if (!result.rows[0]) return null;
  return {
    target_shot: Number(result.rows[0].target_shot),
    inventory_item_id: result.rows[0].inventory_item_id,
    drawing_no: result.rows[0].drawing_no,
  };
}

async function create(data, runner = db) {
  const result = await runner.query(
    `INSERT INTO pm_part_history (part_id, tgl_ganti, shift, counter_saat_diganti, jenis_penggantian, remark, pic_name, user_id, on_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, part_id, tgl_ganti, shift, counter_saat_diganti, jenis_penggantian, remark, pic_name, user_id, on_time, created_at`,
    [
      data.part_id,
      data.tgl_ganti,
      data.shift ?? null,
      data.counter_saat_diganti,
      data.jenis_penggantian,
      data.remark ?? null,
      data.pic_name,
      data.user_id,
      data.on_time,
    ]
  );
  return result.rows[0];
}

// --- Ketepatan PM Part (lihat pmPartHistoryService.js buat definisi on_time) ---

async function getKetepatanOverall({ dateFrom }, runner = db) {
  const result = await runner.query(
    `SELECT
       COUNT(*) FILTER (WHERE on_time IS NOT NULL) AS total,
       COUNT(*) FILTER (WHERE on_time = TRUE) AS on_time_count
     FROM pm_part_history
     WHERE tgl_ganti >= $1`,
    [dateFrom]
  );
  return result.rows[0];
}

async function getKetepatanPerLine({ dateFrom }, runner = db) {
  const result = await runner.query(
    `SELECT
       p.line_id,
       l.line_name,
       COUNT(*) FILTER (WHERE h.on_time IS NOT NULL) AS total,
       COUNT(*) FILTER (WHERE h.on_time = TRUE) AS on_time_count
     FROM pm_part_history h
     JOIN parts p ON p.id = h.part_id
     JOIN lines l ON l.id = p.line_id
     WHERE h.tgl_ganti >= $1
     GROUP BY p.line_id, l.line_name
     ORDER BY l.line_name ASC`,
    [dateFrom]
  );
  return result.rows;
}

module.exports = {
  findPartForHistory,
  findAll,
  partExists,
  findPartTargetShot,
  create,
  getKetepatanOverall,
  getKetepatanPerLine,
};