// src/sql/roleQueries.js
const db = require('../config/db');

async function findAll(runner = db) {
  const result = await runner.query(
    `SELECT r.id, r.name, r.is_system,
            (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id) AS user_count
     FROM roles r
     ORDER BY r.is_system DESC, r.name ASC`
  );
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`SELECT id, name, is_system FROM roles WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function findByName(name, runner = db) {
  const result = await runner.query(`SELECT id, name, is_system FROM roles WHERE name = $1`, [name]);
  return result.rows[0] || null;
}

async function create(name, runner = db) {
  const result = await runner.query(
    `INSERT INTO roles (name, is_system) VALUES ($1, FALSE) RETURNING id, name, is_system`,
    [name]
  );
  return result.rows[0];
}

async function update(id, name, runner = db) {
  const result = await runner.query(`UPDATE roles SET name = $1 WHERE id = $2 RETURNING id, name, is_system`, [
    name,
    id,
  ]);
  return result.rows[0] || null;
}

async function remove(id, runner = db) {
  await runner.query(`DELETE FROM roles WHERE id = $1`, [id]);
}

async function countUsersByRole(id, runner = db) {
  const result = await runner.query(`SELECT COUNT(*)::int AS count FROM users WHERE role_id = $1`, [id]);
  return result.rows[0].count;
}

module.exports = { findAll, findById, findByName, create, update, remove, countUsersByRole };
