// src/sql/roleQueries.js
const db = require('../config/db');

async function findAll(runner = db) {
  const result = await runner.query(
    `SELECT r.id, r.name, r.is_system,
            (SELECT COUNT(*)::int FROM users u WHERE u.role_id = r.id) AS user_count
     FROM roles r
     WHERE r.deleted_at IS NULL
     ORDER BY r.is_system DESC, r.name ASC`
  );
  return result.rows;
}

async function findById(id, runner = db) {
  const result = await runner.query(`SELECT id, name, is_system FROM roles WHERE id = $1 AND deleted_at IS NULL`, [
    id,
  ]);
  return result.rows[0] || null;
}

// Uniqueness check - filter deleted_at IS NULL (nama role di Recycle Bin
// bisa dipakai ulang, lihat migration 1700000017000).
async function findByName(name, runner = db) {
  const result = await runner.query(`SELECT id, name, is_system FROM roles WHERE name = $1 AND deleted_at IS NULL`, [
    name,
  ]);
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

// SOFT DELETE (Recycle Bin) - lihat catatan yang sama di lineQueries.js.
// Role bawaan (is_system) sudah diblokir di roleManagementService.deleteRole
// SEBELUM sampai sini, jadi remove() ini gak perlu re-cek is_system lagi -
// beda dengan bulk-delete generik (recycleBinService) yang emang harus
// re-cek karena bypass service ini.
async function remove(id, userId, runner = db) {
  await runner.query(`UPDATE roles SET deleted_at = now(), deleted_by = $1 WHERE id = $2`, [userId, id]);
}

async function countUsersByRole(id, runner = db) {
  const result = await runner.query(`SELECT COUNT(*)::int AS count FROM users WHERE role_id = $1`, [id]);
  return result.rows[0].count;
}

module.exports = { findAll, findById, findByName, create, update, remove, countUsersByRole };
