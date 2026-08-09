// src/sql/supplierQueries.js
const db = require('../config/db');

const BASE_SELECT = `
  SELECT id, supplier_name, contact_person, phone, email, address, notes, is_active, created_at, updated_at
  FROM suppliers
`;

async function findAll({ isActive, search } = {}, runner = db) {
  const conditions = [];
  const params = [];

  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`is_active = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(supplier_name ILIKE $${params.length} OR contact_person ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await runner.query(`${BASE_SELECT} ${where} ORDER BY supplier_name ASC`, params);
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`${BASE_SELECT} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function findByName(supplierName, runner = db) {
  const result = await runner.query(`SELECT id FROM suppliers WHERE supplier_name = $1`, [supplierName]);
  return result.rows[0] || null;
}

async function create(
  { supplier_name, contact_person = null, phone = null, email = null, address = null, notes = null },
  runner = db
) {
  const result = await runner.query(
    `INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, supplier_name, contact_person, phone, email, address, notes, is_active, created_at, updated_at`,
    [supplier_name, contact_person, phone, email, address, notes]
  );
  return result.rows[0];
}

async function update(id, fields, runner = db) {
  const setClauses = ['updated_at = now()'];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    params.push(value);
    setClauses.push(`${key} = $${params.length}`);
  }
  params.push(id);

  const result = await runner.query(
    `UPDATE suppliers SET ${setClauses.join(', ')} WHERE id = $${params.length}
     RETURNING id, supplier_name, contact_person, phone, email, address, notes, is_active, created_at, updated_at`,
    params
  );
  return result.rows[0] || null;
}

async function remove(id, runner = db) {
  await runner.query(`DELETE FROM suppliers WHERE id = $1`, [id]);
}

async function countPartLinksBySupplier(id, runner = db) {
  const result = await runner.query(`SELECT COUNT(*)::int AS count FROM part_suppliers WHERE supplier_id = $1`, [
    id,
  ]);
  return result.rows[0].count;
}

module.exports = { findAll, findById, findByName, create, update, remove, countPartLinksBySupplier };
