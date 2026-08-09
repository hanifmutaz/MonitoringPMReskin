// src/sql/permissionQueries.js
const db = require('../config/db');

async function findAllPermissions(runner = db) {
  const result = await runner.query(`SELECT key, label, description FROM permissions ORDER BY key ASC`);
  return result.rows;
}

async function findPermissionKeysByRoleId(roleId, runner = db) {
  const result = await runner.query(`SELECT permission_key FROM role_permissions WHERE role_id = $1`, [roleId]);
  return result.rows.map((r) => r.permission_key);
}

async function hasPermission(roleId, permissionKey, runner = db) {
  const result = await runner.query(
    `SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_key = $2 LIMIT 1`,
    [roleId, permissionKey]
  );
  return result.rows.length > 0;
}

async function setRolePermissions(roleId, permissionKeys, runner = db) {
  await runner.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
  if (!permissionKeys || permissionKeys.length === 0) return;
  const values = permissionKeys.map((_, i) => `($1, $${i + 2})`).join(', ');
  await runner.query(
    `INSERT INTO role_permissions (role_id, permission_key) VALUES ${values} ON CONFLICT DO NOTHING`,
    [roleId, ...permissionKeys]
  );
}

module.exports = { findAllPermissions, findPermissionKeysByRoleId, hasPermission, setRolePermissions };
