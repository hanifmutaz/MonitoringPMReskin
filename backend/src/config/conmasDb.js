// src/config/conmasDb.js
//
// Koneksi TERPISAH ke DB ConMas, read-only. Kredensial (CONMAS_DB_*) WAJIB
// akun PostgreSQL dengan grant SELECT saja (lihat 06_ENVIRONMENT_AND_BOOTSTRAP.md
// §2 & 02_DEVELOPMENT_RULES.md §21) — bukan akun yang dipakai sistem ConMas
// untuk operasi CRUD-nya sendiri, dan BUKAN pool yang sama dengan
// src/config/db.js (yang itu buat DB aplikasi PM Monitoring sendiri).

const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

let pool = null;

function isConfigured() {
  return !!(env.conmas.host && env.conmas.database && env.conmas.user);
}

function getPool() {
  if (!isConfigured()) {
    throw new Error('Kredensial CONMAS_DB_* belum diisi di .env');
  }
  if (!pool) {
    pool = new Pool({
      host: env.conmas.host,
      port: env.conmas.port,
      database: env.conmas.database,
      user: env.conmas.user,
      password: env.conmas.password,
      // Sync job jalan berkala (bukan per-request) - koneksi minim cukup
      max: 3,
    });
    pool.on('error', (err) => logger.error('Unexpected error on ConMas DB idle client', err));
  }
  return pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { query, isConfigured };
