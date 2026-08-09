// src/services/conmasSyncService.js
//
// Fase 3 MASTER DOCUMENT (Adapter Sync ConMas) — akhirnya bisa dibangun
// setelah skema tabel ConMas dikonfirmasi pemilik project (18 Jul 2026).
//
// Shot count yang disimpan ke production_cache.output_actual BUKAN cuma
// "Output Actual (good)" mentah dari ConMas — sesuai konfirmasi pemilik
// project, Reject juga menghabiskan 1 siklus tool/die secara fisik.
// Penggabungan ini dikontrol setting `pm_part_counter_include_reject`
// (dibaca dari app_settings, BUKAN hardcode — Development Rules §18):
//   TRUE  -> shot = output_actual (good) + reject_f027 + reject_f028 + reject_m107
//   FALSE -> shot = output_actual (good) saja

const db = require('../config/db');
const conmasDb = require('../config/conmasDb');
const conmasQueries = require('../sql/conmasQueries');
const productionCacheQueries = require('../sql/productionCacheQueries');
const lineQueries = require('../sql/lineQueries');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

async function runSync() {
  if (!conmasDb.isConfigured()) {
    logger.warn('Sync ConMas dilewati - kredensial CONMAS_DB_* belum diisi di .env');
    return { skipped: true };
  }

  logger.info('Sync Started');

  const lookbackDays = (await settingsService.getSetting('sync_lookback_days')) || 90;
  const includeReject = await settingsService.getSetting('pm_part_counter_include_reject');

  let rawRows;
  try {
    rawRows = await conmasQueries.fetchProductionData(lookbackDays);
  } catch (err) {
    logger.error('Sync Failed - gagal query ConMas', err);
    return { skipped: false, error: true };
  }

  // Line code (dari ConMas, mis. "41HR101") -> line_id internal kita.
  // Line yang belum terdaftar di Master Data kita SENGAJA di-skip (bukan
  // auto-create) - Master Data tetap 1 sumber kebenaran yang dikelola Admin.
  const allLines = await lineQueries.findAll({});
  const lineMap = new Map(allLines.map((l) => [l.line_name, l.id]));

  const toUpsert = [];
  const unmappedLines = new Set();

  for (const row of rawRows) {
    const lineId = lineMap.get(row.line_code);
    if (!lineId) {
      unmappedLines.add(row.line_code);
      continue;
    }

    const rejectTotal = includeReject
      ? Number(row.reject_f027) + Number(row.reject_f028) + Number(row.reject_m107)
      : 0;
    const shotCount = Math.max(0, Math.round(Number(row.output_actual) + rejectTotal));

    toUpsert.push({
      line_id: lineId,
      cl_no: row.cl_no,
      tanggal: row.tanggal,
      output_actual: shotCount,
    });
  }

  if (unmappedLines.size > 0) {
    logger.warn(`Sync: ${unmappedLines.size} Line dari ConMas belum ada di Master Data: ${[...unmappedLines].join(', ')}`);
  }

  // Beberapa slot CL bisa nunjuk (line,cl_no,tanggal) yang sama dalam 1
  // shift atau di shift berbeda hari yang sama - jumlahin dulu sebelum
  // upsert (production_cache 1 baris per line+cl_no+tanggal, bukan per shift).
  const merged = new Map();
  for (const row of toUpsert) {
    const key = `${row.line_id}|${row.cl_no}|${row.tanggal}`;
    if (!merged.has(key)) {
      merged.set(key, { ...row });
    } else {
      merged.get(key).output_actual += row.output_actual;
    }
  }
  const mergedRows = Array.from(merged.values());

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await productionCacheQueries.upsertBatch(mergedRows, client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Sync Failed - gagal upsert production_cache', err);
    return { skipped: false, error: true };
  } finally {
    client.release();
  }

  logger.info(`Sync Finished (${mergedRows.length} rows)`);
  return { skipped: false, error: false, rowsSynced: mergedRows.length };
}

module.exports = { runSync };
