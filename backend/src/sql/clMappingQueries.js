// src/sql/clMappingQueries.js
const db = require('../config/db');

async function findByPartId(partId, runner = db) {
  const result = await runner.query(
    `SELECT id, cl_no, product_name, jig_name FROM part_cl_mapping WHERE part_id = $1 ORDER BY cl_no ASC`,
    [partId]
  );
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`SELECT * FROM part_cl_mapping WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function findByPartAndClNo(partId, clNo, runner = db) {
  const result = await runner.query(`SELECT id FROM part_cl_mapping WHERE part_id = $1 AND cl_no = $2`, [
    partId,
    clNo,
  ]);
  return result.rows[0] || null;
}

async function partExists(partId, runner = db) {
  const result = await runner.query(`SELECT id FROM parts WHERE id = $1`, [partId]);
  return !!result.rows[0];
}

async function create({ part_id, cl_no, product_name, jig_name }, runner = db) {
  const result = await runner.query(
    `INSERT INTO part_cl_mapping (part_id, cl_no, product_name, jig_name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, part_id, cl_no, product_name, jig_name, created_at`,
    [part_id, cl_no, product_name ?? null, jig_name ?? null]
  );
  return result.rows[0];
}

async function remove(id, runner = db) {
  await runner.query(`DELETE FROM part_cl_mapping WHERE id = $1`, [id]);
}

module.exports = { findByPartId, findById, findByPartAndClNo, partExists, create, remove };
