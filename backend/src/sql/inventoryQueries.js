// src/sql/inventoryQueries.js
const db = require('../config/db');

const ITEM_SELECT = `
  SELECT
    i.id, i.spare_part_number, i.part_name, i.location, i.note, i.current_stock, i.lead_time_days,
    i.is_active, i.created_at, i.updated_at,
    (SELECT COUNT(*)::int FROM parts p WHERE p.inventory_item_id = i.id) AS linked_part_count
  FROM inventory_items i
`;

async function findAllItems({ search, page = 1, limit = 20 } = {}, runner = db) {
  const conditions = ['i.deleted_at IS NULL'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(i.spare_part_number ILIKE $${params.length} OR i.part_name ILIKE $${params.length})`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await runner.query(`SELECT COUNT(*)::int AS total FROM inventory_items i ${where}`, params);
  const dataParams = [...params, Number(limit), offset];
  const dataResult = await runner.query(
    `${ITEM_SELECT} ${where} ORDER BY i.part_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams
  );

  return { items: dataResult.rows, total: countResult.rows[0].total, page: Number(page), limit: Number(limit) };
}

async function findItemById(id, runner = db) {
  const result = await runner.query(`${ITEM_SELECT} WHERE i.id = $1 AND i.deleted_at IS NULL`, [id]);
  return result.rows[0] || null;
}

async function findRawItemById(id, runner = db) {
  const result = await runner.query(`SELECT * FROM inventory_items WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

// Uniqueness check - filter deleted_at IS NULL (Spare Part Number di
// Recycle Bin bisa dipakai ulang, lihat migration 1700000017000).
async function findItemBySparePartNumber(sparePartNumber, runner = db) {
  const result = await runner.query(
    `SELECT id FROM inventory_items WHERE spare_part_number = $1 AND deleted_at IS NULL`,
    [sparePartNumber]
  );
  return result.rows[0] || null;
}

async function createItem({ spare_part_number, part_name, location, note, lead_time_days }, runner = db) {
  const result = await runner.query(
    `INSERT INTO inventory_items (spare_part_number, part_name, location, note, lead_time_days, current_stock)
     VALUES ($1, $2, $3, $4, $5, 0)
     RETURNING id, spare_part_number, part_name, location, note, lead_time_days, current_stock, is_active, created_at, updated_at`,
    [spare_part_number, part_name, location ?? null, note ?? null, lead_time_days ?? null]
  );
  return result.rows[0];
}

async function updateItem(id, fields, runner = db) {
  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    setClauses.push(`${key} = $${params.length}`);
  }
  setClauses.push(`updated_at = now()`);
  params.push(id);

  const result = await runner.query(
    `UPDATE inventory_items SET ${setClauses.join(', ')} WHERE id = $${params.length}
     RETURNING id, spare_part_number, part_name, location, note, lead_time_days, current_stock, is_active, created_at, updated_at`,
    params
  );
  return result.rows[0] || null;
}

async function adjustCurrentStock(id, delta, runner = db) {
  const result = await runner.query(
    `UPDATE inventory_items SET current_stock = current_stock + $1, updated_at = now()
     WHERE id = $2
     RETURNING id, spare_part_number, part_name, location, note, lead_time_days, current_stock, is_active, created_at, updated_at`,
    [delta, id]
  );
  return result.rows[0] || null;
}

// SOFT DELETE (Recycle Bin) - lihat catatan yang sama di lineQueries.js.
async function removeItem(id, userId, runner = db) {
  await runner.query(`UPDATE inventory_items SET deleted_at = now(), deleted_by = $1 WHERE id = $2`, [userId, id]);
}

async function countLinkedParts(id, runner = db) {
  const result = await runner.query(
    `SELECT COUNT(*)::int AS count FROM parts WHERE inventory_item_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0].count;
}

async function countMovements(id, runner = db) {
  const result = await runner.query(`SELECT COUNT(*)::int AS count FROM inventory_stock_movements WHERE inventory_item_id = $1`, [
    id,
  ]);
  return result.rows[0].count;
}

async function insertMovement(
  { inventory_item_id, movement_type, qty, note, ref_type, ref_id, user_id },
  runner = db
) {
  const result = await runner.query(
    `INSERT INTO inventory_stock_movements (inventory_item_id, movement_type, qty, note, ref_type, ref_id, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, inventory_item_id, movement_type, qty, note, ref_type, ref_id, user_id, created_at`,
    [inventory_item_id, movement_type, qty, note ?? null, ref_type ?? null, ref_id ?? null, user_id]
  );
  return result.rows[0];
}

async function findMovementsByItem(itemId, { page = 1, limit = 20 } = {}, runner = db) {
  const offset = (Number(page) - 1) * Number(limit);
  const countResult = await runner.query(
    `SELECT COUNT(*)::int AS total FROM inventory_stock_movements WHERE inventory_item_id = $1`,
    [itemId]
  );
  const dataResult = await runner.query(
    `SELECT m.id, m.inventory_item_id, m.movement_type, m.qty, m.note, m.ref_type, m.ref_id,
            m.user_id, u.full_name AS user_full_name, m.created_at
     FROM inventory_stock_movements m
     JOIN users u ON u.id = m.user_id
     WHERE m.inventory_item_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2 OFFSET $3`,
    [itemId, Number(limit), offset]
  );
  return { items: dataResult.rows, total: countResult.rows[0].total, page: Number(page), limit: Number(limit) };
}

async function findAllMovements({ item_id, movement_type, page = 1, limit = 20 } = {}, runner = db) {
  const conditions = [];
  const params = [];

  if (item_id) {
    params.push(item_id);
    conditions.push(`m.inventory_item_id = $${params.length}`);
  }
  if (movement_type) {
    params.push(movement_type);
    conditions.push(`m.movement_type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const countResult = await runner.query(
    `SELECT COUNT(*)::int AS total FROM inventory_stock_movements m ${where}`,
    params
  );
  const dataParams = [...params, Number(limit), offset];
  const dataResult = await runner.query(
    `SELECT m.id, m.inventory_item_id, i.spare_part_number, i.part_name,
            m.movement_type, m.qty, m.note, m.ref_type, m.ref_id,
            m.user_id, u.full_name AS user_full_name, m.created_at
     FROM inventory_stock_movements m
     JOIN inventory_items i ON i.id = m.inventory_item_id
     JOIN users u ON u.id = m.user_id
     ${where}
     ORDER BY m.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams
  );
  return { items: dataResult.rows, total: countResult.rows[0].total, page: Number(page), limit: Number(limit) };
}

async function findPartsByInventoryItem(itemId, runner = db) {
  const result = await runner.query(
    `SELECT p.id, p.line_id, l.line_name, p.jig_name, p.drawing_no, p.part_name
     FROM parts p
     JOIN lines l ON l.id = p.line_id
     WHERE p.inventory_item_id = $1
     ORDER BY l.line_name ASC, p.jig_name ASC`,
    [itemId]
  );
  return result.rows;
}

module.exports = {
  findAllItems,
  findItemById,
  findRawItemById,
  findItemBySparePartNumber,
  createItem,
  updateItem,
  adjustCurrentStock,
  removeItem,
  countLinkedParts,
  countMovements,
  insertMovement,
  findMovementsByItem,
  findAllMovements,
  findPartsByInventoryItem,
};