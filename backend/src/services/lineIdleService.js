// src/services/lineIdleService.js
//
// Line TIDAK RUNNING + kewajiban cleaning-nya. Aturan (lihat utils/lineIdle.js
// dan migration 1700000037000):
//   - tidak running = tidak ada output >= idle_min_days hari (default 7)
//   - cleaning wajib tiap idle_cleaning_interval_days hari (default 60), dari cleaning terakhir
// Dihitung live dari production_cache; semua angka bisa diubah di Settings.

const db = require('../config/db');
const lineIdleQueries = require('../sql/lineIdleQueries');
const pmLineQueries = require('../sql/pmLineQueries');
const settingsService = require('./settingsService');
const { computeIdleStatus } = require('../utils/lineIdle');
const { recordAudit } = require('../utils/auditLog');
const dateUtils = require('../utils/dateUtils');
const AppError = require('../utils/AppError');

// warnDays/dangerDays = batas warna kuning/merah panel Cleaning (sisa hari cleaning), murni tampilan.
const DEFAULTS = { enabled: true, minDays: 7, intervalDays: 60, warnDays: 14, dangerDays: 7 };

async function getIdleConfig() {
  const s = await settingsService.getSettings([
    'idle_monitoring_enabled',
    'idle_min_days',
    'idle_cleaning_interval_days',
    'idle_cleaning_warn_days',
    'idle_cleaning_danger_days',
  ]);
  // Migration belum jalan / key belum ada -> pakai default (jangan crash dashboard).
  return {
    enabled: s.idle_monitoring_enabled === undefined ? DEFAULTS.enabled : s.idle_monitoring_enabled,
    minDays: s.idle_min_days > 0 ? s.idle_min_days : DEFAULTS.minDays,
    intervalDays: s.idle_cleaning_interval_days > 0 ? s.idle_cleaning_interval_days : DEFAULTS.intervalDays,
    warnDays: s.idle_cleaning_warn_days >= 0 ? s.idle_cleaning_warn_days : DEFAULTS.warnDays,
    dangerDays: s.idle_cleaning_danger_days >= 0 ? s.idle_cleaning_danger_days : DEFAULTS.dangerDays,
  };
}

/**
 * Semua Line yang sedang tidak running, urut paling lama idle dulu.
 * Line yang cleaning-nya sudah jatuh tempo ditandai cleaning_required.
 */
async function getIdleLines() {
  const cfg = await getIdleConfig();
  if (!cfg.enabled) return { config: cfg, items: [] };

  const rows = await lineIdleQueries.findLineActivity();
  const todayStr = dateUtils.todayString();
  const items = [];
  for (const row of rows) {
    const status = computeIdleStatus(row, cfg, todayStr);
    if (!status.is_idle) continue;
    items.push({ line_id: row.line_id, line_name: row.line_name, ...status });
  }
  items.sort((a, b) => b.idle_days - a.idle_days || a.line_name.localeCompare(b.line_name));
  return { config: cfg, items };
}

/** Set nama Line yang tidak running - dipakai untuk menyaring Jadwal PM 7 Hari ke Depan. */
async function getIdleLineNameSet() {
  const { items } = await getIdleLines();
  return new Set(items.map((i) => i.line_name));
}

async function submitCleaning(data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const line = await pmLineQueries.findLineById(data.line_id, client);
    if (!line) {
      throw AppError.badRequest('Validasi gagal', { line_id: 'Line tidak ditemukan' });
    }

    const tglCleaning = data.tgl_cleaning || dateUtils.todayString();
    const created = await lineIdleQueries.createCleaning({ ...data, tgl_cleaning: tglCleaning, user_id: userId }, client);

    await recordAudit(
      {
        tableName: 'line_cleaning_history',
        recordId: created.id,
        action: 'CREATE',
        oldValue: null,
        newValue: created,
        userId,
      },
      client
    );

    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listCleaning(lineId) {
  return lineIdleQueries.findCleaningByLine({ lineId });
}

module.exports = { getIdleConfig, getIdleLines, getIdleLineNameSet, submitCleaning, listCleaning };
