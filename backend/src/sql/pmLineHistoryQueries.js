// src/sql/pmLineHistoryQueries.js
const db = require('../config/db');

const LIST_SELECT = `
  SELECT h.id, h.line_id, COALESCE(l.line_name, h.line_name_snapshot) AS line_name, h.tgl_input, h.jenis_pm, h.keterangan, h.pic_name, h.on_time, h.alasan_telat,
         h.user_id, u.full_name AS user_full_name, h.created_at
  FROM pm_monthly_history h
  LEFT JOIN lines l ON l.id = h.line_id
  JOIN users u ON u.id = h.user_id
`;

function buildWhere({ lineId, jenis, dateFrom, dateTo } = {}) {
  const conditions = ['h.deleted_at IS NULL'];
  const params = [];

  if (lineId) {
    params.push(lineId);
    conditions.push(`h.line_id = $${params.length}`);
  }
  if (jenis) {
    params.push(jenis);
    conditions.push(`h.jenis_pm = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`h.tgl_input >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`h.tgl_input <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

async function findAll({ lineId, jenis, dateFrom, dateTo, page = 1, limit = 20 } = {}, runner = db) {
  const { where, params } = buildWhere({ lineId, jenis, dateFrom, dateTo });
  const offset = (page - 1) * limit;

  const itemsResult = await runner.query(
    `${LIST_SELECT} ${where} ORDER BY h.tgl_input DESC, h.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2
    }`,
    [...params, limit, offset]
  );
  const countResult = await runner.query(
    `SELECT COUNT(*)::int AS total FROM pm_monthly_history h ${where}`,
    params
  );

  return { items: itemsResult.rows, total: countResult.rows[0].total, page, limit };
}

/** Semua baris yang cocok filter (tanpa pagination) buat export; maxRows = cap+1. */
async function findAllForExport({ lineId, jenis, dateFrom, dateTo, maxRows } = {}, runner = db) {
  const { where, params } = buildWhere({ lineId, jenis, dateFrom, dateTo });
  const limitSql = maxRows ? ` LIMIT ${Number(maxRows)}` : '';
  const result = await runner.query(
    `${LIST_SELECT} ${where} ORDER BY h.tgl_input DESC, h.id DESC${limitSql}`,
    params
  );
  return result.rows;
}

async function create(data, runner = db) {
  const result = await runner.query(
    `INSERT INTO pm_monthly_history (line_id, tgl_input, jenis_pm, keterangan, pic_name, user_id, on_time, alasan_telat, telat_hari)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, line_id, tgl_input, jenis_pm, keterangan, pic_name, user_id, on_time, alasan_telat, telat_hari, created_at`,
    [
      data.line_id,
      data.tgl_input,
      data.jenis_pm,
      data.keterangan ?? null,
      data.pic_name,
      data.user_id,
      data.on_time,
      data.alasan_telat ?? null,
      data.telat_hari ?? null,
    ]
  );
  return result.rows[0];
}

// 1 baris history (bentuk sama dengan list) - belum dihapus. null kalau tidak ada.
async function findById(id, runner = db) {
  const result = await runner.query(`${LIST_SELECT} WHERE h.id = $1 AND h.deleted_at IS NULL`, [id]);
  return result.rows[0] || null;
}

// Edit terbatas: hanya keterangan, pic_name, alasan_telat (kolom lain sengaja tidak tersentuh).
async function updateEditable(id, { keterangan, pic_name, alasan_telat }, runner = db) {
  const result = await runner.query(
    `UPDATE pm_monthly_history
     SET keterangan = $2, pic_name = $3, alasan_telat = $4
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id, keterangan, pic_name, alasan_telat]
  );
  return result.rowCount > 0;
}

// --- Ketepatan PM Monthly/Weekly (lihat pmLineHistoryService.js buat definisi on_time) ---

// dateTo OPSIONAL (inklusif). Tanpa dateTo = dari dateFrom sampai sekarang
// (perilaku lama, dipakai angka "tahun berjalan").
async function getKetepatanOverall({ dateFrom, dateTo }, runner = db) {
  const params = [dateFrom];
  let dateToSql = '';
  if (dateTo) {
    params.push(dateTo);
    dateToSql = ` AND tgl_input <= $${params.length}`;
  }
  const result = await runner.query(
    `SELECT
       jenis_pm,
       COUNT(*) FILTER (WHERE on_time IS NOT NULL) AS total,
       COUNT(*) FILTER (WHERE on_time = TRUE) AS on_time_count
     FROM pm_monthly_history
     WHERE tgl_input >= $1${dateToSql} AND deleted_at IS NULL
     GROUP BY jenis_pm`,
    params
  );
  return result.rows;
}

// Ketepatan per bulan kalender (key 'YYYY-MM' dari tgl_input) per jenis PM.
async function getKetepatanByMonth({ dateFrom, dateTo }, runner = db) {
  const result = await runner.query(
    `SELECT
       to_char(tgl_input, 'YYYY-MM') AS month,
       jenis_pm,
       COUNT(*) FILTER (WHERE on_time IS NOT NULL) AS total,
       COUNT(*) FILTER (WHERE on_time = TRUE) AS on_time_count
     FROM pm_monthly_history
     WHERE tgl_input >= $1 AND tgl_input <= $2 AND deleted_at IS NULL
     GROUP BY 1, jenis_pm
     ORDER BY 1 ASC`,
    [dateFrom, dateTo]
  );
  return result.rows;
}

async function getKetepatanPerLine({ dateFrom }, runner = db) {
  const result = await runner.query(
    `SELECT
       h.line_id,
       COALESCE(l.line_name, h.line_name_snapshot) AS line_name,
       h.jenis_pm,
       COUNT(*) FILTER (WHERE h.on_time IS NOT NULL) AS total,
       COUNT(*) FILTER (WHERE h.on_time = TRUE) AS on_time_count
     FROM pm_monthly_history h
     LEFT JOIN lines l ON l.id = h.line_id
     WHERE h.tgl_input >= $1 AND h.deleted_at IS NULL
     GROUP BY h.line_id, COALESCE(l.line_name, h.line_name_snapshot), h.jenis_pm
     ORDER BY COALESCE(l.line_name, h.line_name_snapshot) ASC`,
    [dateFrom]
  );
  return result.rows;
}

// PM Monthly/Weekly yang dinilai telat (on_time = FALSE) untuk 1 Line sejak dateFrom.
async function findLateEvents({ lineId, dateFrom }, runner = db) {
  const result = await runner.query(
    `SELECT h.id, h.tgl_input, h.jenis_pm, h.pic_name, h.keterangan, h.alasan_telat, h.telat_hari, h.created_at
     FROM pm_monthly_history h
     WHERE h.line_id = $1 AND h.on_time = FALSE AND h.deleted_at IS NULL AND h.tgl_input >= $2
     ORDER BY h.tgl_input DESC, h.id DESC`,
    [lineId, dateFrom]
  );
  return result.rows;
}

module.exports = {
  findById,
  updateEditable,
  findLateEvents,
  findAllForExport,
  findAll,
  create,
  getKetepatanOverall,
  getKetepatanByMonth,
  getKetepatanPerLine,
};