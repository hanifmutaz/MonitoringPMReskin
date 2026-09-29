// src/config/db.js
const { Pool } = require('pg');
require('./pgTypes'); // DATE tetap string 'YYYY-MM-DD' (anti geser 1 hari di server WIB)
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: env.dbPool.max,
  idleTimeoutMillis: env.dbPool.idleTimeoutMillis,
  connectionTimeoutMillis: env.dbPool.connectionTimeoutMillis,
  // Query yang nge-hang jangan menahan koneksi pool selamanya.
  statement_timeout: env.dbPool.statementTimeoutMs,
  ssl: env.dbPool.ssl,
});

pool.on('error', (err) => {
  // Error di idle client (koneksi putus dsb) — jangan sampai crash process diam-diam.
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Query helper generik. Semua SQL Layer (src/sql/*) wajib lewat sini,
 * bukan bikin koneksi sendiri-sendiri.
 * @param {string} text - SQL parameterized query
 * @param {Array} params
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Dipakai untuk operasi yang butuh transaksi (mis. update + insert audit_log
 * dalam 1 unit kerja). Caller wajib client.release() di finally.
 */
async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
};
