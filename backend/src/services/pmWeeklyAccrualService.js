// src/services/pmWeeklyAccrualService.js
//
// FIX (24 Sep 2026): migration 1700000019000 nambahin kolom
// akumulasi_poin_weekly + setting pm_weekly_point_full_run/
// pm_weekly_min_run_count_full, niatnya PM Weekly ikut basis poin sama
// kayak PM Monthly. Tapi belum pernah ada job yang beneran nge-hitung
// akumulasi_poin_weekly - satu-satunya tempat kolom itu disentuh sebelum
// fix ini cuma reset ke 0 pas PM Weekly dilakuin (pmLineHistoryService.js).
// Jadi status PM Weekly nggak pernah ter-update otomatis dari pemakaian
// harian. Service ini melengkapi bagian yang bolong itu.
//
// Pola & formula SAMA PERSIS dengan pmMonthlyAccrualService.js (termasuk
// fix proporsional per jumlah_shift dari migration 1700000022000):
//
//   poin_hari_itu = MIN(running / line.jumlah_shift, 1) * pm_weekly_point_full_run
//   akumulasi dihitung dari (Tgl PM Weekly Terakhir, hari ini], di-cap ke
//   pm_weekly_total_days (dipakai ulang sebagai cap poin - lihat migration
//   1700000019000, key-nya sengaja tidak diganti).
//
// STRATEGI: full RECOMPUTE tiap kali job jalan (idempotent), sama seperti
// Monthly - lihat komentar header pmMonthlyAccrualService.js.

const conmasDb = require('../config/conmasDb');
const conmasQueries = require('../sql/conmasQueries');
const lineQueries = require('../sql/lineQueries');
const pmLineQueries = require('../sql/pmLineQueries');
const settingsService = require('./settingsService');
const dateUtils = require('../utils/dateUtils');
const logger = require('../utils/logger');
const { computeDailyPoints } = require('../utils/pmPointFormula');

async function recomputeAllLines() {
  if (!conmasDb.isConfigured()) {
    logger.warn('Recompute PM Weekly accrual dilewati - kredensial CONMAS_DB_* belum diisi');
    return { skipped: true };
  }

  const settings = await settingsService.getSettings([
    'sync_lookback_days',
    'pm_weekly_total_days',
    'pm_weekly_point_full_run',
  ]);

  let runCountRows;
  try {
    runCountRows = await conmasQueries.fetchDailyRunCounts(settings.sync_lookback_days || 90);
  } catch (err) {
    logger.error('Recompute PM Weekly accrual gagal - query ConMas error', err);
    return { skipped: false, error: true };
  }

  // Map: line_code -> Map(tanggal 'YYYY-MM-DD' -> run_count)
  const byLine = new Map();
  for (const row of runCountRows) {
    if (!byLine.has(row.line_code)) byLine.set(row.line_code, new Map());
    byLine.get(row.line_code).set(dateUtils.formatDate(row.tanggal), Number(row.run_count));
  }

  const activeLines = await lineQueries.findAll({ isActive: true });
  let updatedCount = 0;

  for (const line of activeLines) {
    await pmLineQueries.ensureHelperExists(line.id);
    const helper = await pmLineQueries.findHelperByLine(line.id);

    if (!helper || !helper.tgl_pm_weekly_terakhir) {
      // Belum pernah ada PM Weekly sama sekali -> belum ada baseline,
      // konsisten dengan pmLineService (status DANGER "belum pernah PM").
      continue;
    }

    const baseline = dateUtils.parseDbDate(helper.tgl_pm_weekly_terakhir);
    const today = dateUtils.today();
    const lineRunCounts = byLine.get(line.line_name) || new Map();
    const jumlahShift = line.jumlah_shift || 2;
    const pointFullRun = settings.pm_weekly_point_full_run ?? 1;

    let totalPoints = 0;
    let cursor = baseline.add(1, 'day');
    while (!cursor.isAfter(today)) {
      const dateStr = cursor.format('YYYY-MM-DD');
      const runCount = lineRunCounts.get(dateStr) || 0;

      totalPoints += computeDailyPoints(runCount, jumlahShift, pointFullRun);
      cursor = cursor.add(1, 'day');
    }

    const cappedPoints = Math.min(totalPoints, settings.pm_weekly_total_days || 7);
    await pmLineQueries.updateHelper(line.id, { akumulasi_poin_weekly: cappedPoints });
    updatedCount += 1;
  }

  logger.info(`Recompute PM Weekly accrual selesai (${updatedCount} Line)`);
  return { skipped: false, error: false, linesUpdated: updatedCount };
}

module.exports = { recomputeAllLines };
