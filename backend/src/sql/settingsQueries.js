// src/sql/settingsQueries.js
const db = require('../config/db');

async function findAll(runner = db) {
  const result = await runner.query(
    `SELECT key, value, value_type, category, description, updated_by, updated_at
     FROM app_settings
     ORDER BY category ASC, key ASC`
  );
  return result.rows;
}

async function findByKey(key, runner = db) {
  const result = await runner.query(`SELECT * FROM app_settings WHERE key = $1`, [key]);
  return result.rows[0] || null;
}

async function updateValue(key, value, userId, runner = db) {
  const result = await runner.query(
    `UPDATE app_settings SET value = $1, updated_by = $2, updated_at = now() WHERE key = $3
     RETURNING key, value, value_type, category, description, updated_by, updated_at`,
    [value, userId, key]
  );
  return result.rows[0] || null;
}

// Semua grant setting_role_access sekaligus, dikembalikan sebagai
// { setting_key: [role_id, ...] } - dipakai listSettings() supaya cuma 1
// round-trip DB (bukan query per-key).
async function findAllRoleAccessGrouped(runner = db) {
  const result = await runner.query('SELECT setting_key, role_id FROM setting_role_access');
  const map = {};
  for (const row of result.rows) {
    if (!map[row.setting_key]) map[row.setting_key] = [];
    map[row.setting_key].push(row.role_id);
  }
  return map;
}

async function findRoleIdsByKey(key, runner = db) {
  const result = await runner.query('SELECT role_id FROM setting_role_access WHERE setting_key = $1', [key]);
  return result.rows.map((r) => r.role_id);
}

async function roleHasAccess(key, roleId, runner = db) {
  const result = await runner.query(
    'SELECT 1 FROM setting_role_access WHERE setting_key = $1 AND role_id = $2',
    [key, roleId]
  );
  return result.rows.length > 0;
}

// Replace TOTAL daftar role yang punya akses edit ke 1 setting key (pola
// sama dengan permissionQueries.setRolePermissions - delete semua lalu
// insert ulang, lebih simpel daripada diff manual & aman dalam 1 transaction).
async function setRoleAccess(key, roleIds, client) {
  await client.query('DELETE FROM setting_role_access WHERE setting_key = $1', [key]);
  if (roleIds.length > 0) {
    const values = roleIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await client.query(
      `INSERT INTO setting_role_access (setting_key, role_id) VALUES ${values}`,
      [key, ...roleIds]
    );
  }
}

module.exports = {
  findAll,
  findByKey,
  updateValue,
  findAllRoleAccessGrouped,
  findRoleIdsByKey,
  roleHasAccess,
  setRoleAccess,
};
