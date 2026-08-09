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

module.exports = { findAll, findByKey, updateValue };
