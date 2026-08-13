// src/sql/partQueries.js
const db = require('../config/db');

const LIST_SELECT = `
  SELECT
    p.id, p.line_id, l.line_name, p.jig_name, p.drawing_no, p.part_name, p.target_shot,
    p.spare_part_number, p.spare_part_qty, p.spare_part_location, p.spare_part_note,
    p.inventory_item_id, inv.spare_part_number AS inv_spare_part_number, inv.current_stock AS inv_current_stock,
    p.is_active,
    (SELECT COUNT(*)::int FROM part_cl_mapping m WHERE m.part_id = p.id) AS cl_count,
    (SELECT COUNT(*)::int FROM part_suppliers ps WHERE ps.part_id = p.id) AS supplier_count
  FROM parts p
  JOIN lines l ON l.id = p.line_id
  LEFT JOIN inventory_items inv ON inv.id = p.inventory_item_id
`;

async function findAll({ lineId, search, page = 1, limit = 20 } = {}, runner = db) {
  const conditions = ['p.deleted_at IS NULL'];
  const params = [];

  if (lineId) {
    params.push(lineId);
    conditions.push(`p.line_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(p.part_name ILIKE $${params.length} OR p.drawing_no ILIKE $${params.length} OR p.jig_name ILIKE $${params.length})`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const itemsResult = await runner.query(
    `${LIST_SELECT} ${where} ORDER BY l.line_name ASC, p.drawing_no ASC LIMIT $${params.length + 1} OFFSET $${
      params.length + 2
    }`,
    [...params, limit, offset]
  );

  const countResult = await runner.query(
    `SELECT COUNT(*)::int AS total FROM parts p JOIN lines l ON l.id = p.line_id ${where}`,
    params
  );

  return { items: itemsResult.rows, total: countResult.rows[0].total, page, limit };
}

async function findById(id, runner = db) {
  const result = await runner.query(`${LIST_SELECT} WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
  return result.rows[0] || null;
}

// Uniqueness check (Line+Jig+Drawing No) - filter deleted_at IS NULL supaya
// kombinasi ini bisa dipakai ulang kalau Part lama sudah masuk Recycle Bin
// (lihat migration 1700000017000, uq_parts_line_jig_drawing_active).
async function findByLineJigAndDrawing(lineId, jigName, drawingNo, runner = db) {
  const result = await runner.query(
    `SELECT id FROM parts WHERE line_id = $1 AND jig_name = $2 AND drawing_no = $3 AND deleted_at IS NULL`,
    [lineId, jigName, drawingNo]
  );
  return result.rows[0] || null;
}

// Dipakai buat lookup hasil SCAN BARCODE (drawing_no dari kamera iPad) di
// Form PM Part. EXACT match (bukan ILIKE %term% seperti findAll/search) -
// barcode fisik harus match persis, gak boleh partial match yang salah part.
// Bisa balikin >1 row karena drawing_no HANYA unik per (line_id, jig_name) -
// part desain sama bisa kepasang di beberapa jig/line berbeda (lihat
// migration 1700000006000). Frontend yang nentuin: 1 hasil -> auto-pick,
// >1 hasil -> operator pilih Line/Jig mana yang dimaksud.
async function findByDrawingNoExact(drawingNo, runner = db) {
  const result = await runner.query(
    `${LIST_SELECT} WHERE p.drawing_no = $1 AND p.is_active = TRUE AND p.deleted_at IS NULL`,
    [drawingNo]
  );
  return result.rows;
}

async function lineExists(lineId, runner = db) {
  const result = await runner.query(`SELECT id FROM lines WHERE id = $1`, [lineId]);
  return !!result.rows[0];
}

async function create(data, runner = db) {
  const result = await runner.query(
    `INSERT INTO parts (line_id, jig_name, drawing_no, part_name, target_shot, spare_part_number, spare_part_qty, spare_part_location, spare_part_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, line_id, jig_name, drawing_no, part_name, target_shot, spare_part_number, spare_part_qty, spare_part_location, spare_part_note, is_active, created_at`,
    [
      data.line_id,
      data.jig_name,
      data.drawing_no,
      data.part_name,
      data.target_shot,
      data.spare_part_number ?? null,
      data.spare_part_qty ?? null,
      data.spare_part_location ?? null,
      data.spare_part_note ?? null,
    ]
  );
  return result.rows[0];
}

async function update(id, fields, runner = db) {
  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    setClauses.push(`${key} = $${params.length}`);
  }
  setClauses.push(`updated_at = now()`);
  params.push(id);

  const result = await runner.query(
    `UPDATE parts SET ${setClauses.join(', ')} WHERE id = $${params.length}
     RETURNING id, line_id, jig_name, drawing_no, part_name, target_shot, spare_part_number, spare_part_qty, spare_part_location, spare_part_note, is_active, updated_at`,
    params
  );
  return result.rows[0] || null;
}

// SOFT DELETE (Recycle Bin) - lihat catatan yang sama di lineQueries.js.
async function remove(id, userId, runner = db) {
  await runner.query(`UPDATE parts SET deleted_at = now(), deleted_by = $1 WHERE id = $2`, [userId, id]);
}

async function countHistoryByPart(id, runner = db) {
  const result = await runner.query(
    `SELECT COUNT(*)::int AS count FROM pm_part_history WHERE part_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0].count;
}

async function findRawById(id, runner = db) {
  const result = await runner.query(`SELECT * FROM parts WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findByLineJigAndDrawing,
  findByDrawingNoExact,
  lineExists,
  create,
  update,
  remove,
  countHistoryByPart,
  findRawById,
};
