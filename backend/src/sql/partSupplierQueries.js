// src/sql/partSupplierQueries.js
const db = require('../config/db');

// is_primary DESC dulu - supplier utama (biasa dipesen ke situ) tampil
// paling atas di daftar, baru diikuti alternatif urut nama.
const BASE_SELECT = `
  SELECT
    ps.id, ps.part_id, ps.supplier_id, ps.is_primary, ps.notes, ps.created_at,
    s.supplier_name, s.contact_person, s.phone, s.email, s.address, s.is_active AS supplier_is_active
  FROM part_suppliers ps
  JOIN suppliers s ON s.id = ps.supplier_id
`;

async function findByPartId(partId, runner = db) {
  const result = await runner.query(
    `${BASE_SELECT} WHERE ps.part_id = $1 ORDER BY ps.is_primary DESC, s.supplier_name ASC`,
    [partId]
  );
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`${BASE_SELECT} WHERE ps.id = $1`, [id]);
  return result.rows[0] || null;
}

async function findByPartAndSupplier(partId, supplierId, runner = db) {
  const result = await runner.query(`SELECT id FROM part_suppliers WHERE part_id = $1 AND supplier_id = $2`, [
    partId,
    supplierId,
  ]);
  return result.rows[0] || null;
}

async function partExists(partId, runner = db) {
  const result = await runner.query(`SELECT id FROM parts WHERE id = $1`, [partId]);
  return !!result.rows[0];
}

async function create({ part_id, supplier_id, is_primary = false, notes = null }, runner = db) {
  const result = await runner.query(
    `INSERT INTO part_suppliers (part_id, supplier_id, is_primary, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, part_id, supplier_id, is_primary, notes, created_at`,
    [part_id, supplier_id, is_primary, notes]
  );
  return result.rows[0];
}

async function updateNotes(id, notes, runner = db) {
  const result = await runner.query(
    `UPDATE part_suppliers SET notes = $1 WHERE id = $2 RETURNING id, part_id, supplier_id, is_primary, notes, created_at`,
    [notes, id]
  );
  return result.rows[0] || null;
}

// Dipanggil DALAM transaction yang sama dengan setPrimary() di bawah - unset
// dulu row lama (kalau ada) sebelum set row baru, supaya gak nabrak partial
// unique index uq_part_suppliers_one_primary (migration 1700000014000).
async function unsetPrimaryForPart(partId, runner = db) {
  await runner.query(`UPDATE part_suppliers SET is_primary = FALSE WHERE part_id = $1 AND is_primary = TRUE`, [
    partId,
  ]);
}

async function setPrimary(id, isPrimary, runner = db) {
  const result = await runner.query(
    `UPDATE part_suppliers SET is_primary = $1 WHERE id = $2 RETURNING id, part_id, supplier_id, is_primary, notes, created_at`,
    [isPrimary, id]
  );
  return result.rows[0] || null;
}

async function remove(id, runner = db) {
  await runner.query(`DELETE FROM part_suppliers WHERE id = $1`, [id]);
}

module.exports = {
  findByPartId,
  findById,
  findByPartAndSupplier,
  partExists,
  create,
  updateNotes,
  unsetPrimaryForPart,
  setPrimary,
  remove,
};
