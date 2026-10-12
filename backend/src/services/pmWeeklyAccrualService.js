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
const { computeAccruedPoints } = require('../utils/pmAccrual');
const { computeLookbackDays } = require('../utils/accrualLookback');

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

  // Rentang query harus mencakup baseline tertua, bukan cuma sync_lookback_days -
  // kalau tidak, Line dengan Tgl PM terakhir lebih tua dari itu poinnya under-count.
  const oldestBaselines = await pmLineQueries.findOldestBaselineDates();
  const lookbackDays = computeLookbackDays(settings.sync_lookback_days, dateUtils.daysSince(oldestBaselines.weekly));

  let runCountRows;
  try {
    runCountRows = await conmasQueries.fetchDailyRunCounts(lookbackDays);
  } catch (err) {
    logger.error('Recompute PM Weekly accrual gagal - query ConMas error', err);
    return { skipped: false, error: true };
  }

  // Map: line_code -> Map(tanggal 'YYYY-MM-DD' -> run_count)
  const byLine = new Map();
  for (const row of runCountRows) {
    if (!byLine.has(row.line_code)) byLine.set(row.line_code, new Map());
    byLine.get(row.line_code).set(dateUtils.formatDate(row.tanggal), { count: Number(row.run_count), shifts: row.shifts || [] });
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

    const lineRunCounts = byLine.get(line.line_name) || new Map();
    const jumlahShift = line.jumlah_shift || 2;
    const pointFullRun = settings.pm_weekly_point_full_run ?? 1;

    // Hari ini (WIB) IKUT dihitung (realtime). totalPointsPrev = poin mentah sampai
    // KEMARIN - dipakai untuk toleransi jam batas PM (migration 1700000033000).
    const { total: totalPoints, totalPrev: totalPointsPrev } = computeAccruedPoints({
      baselineStr: dateUtils.formatDate(helper.tgl_pm_weekly_terakhir),
      todayStr: dateUtils.todayString(),
      shiftCut: helper.pm_weekly_baseline_shift_cut,
      runCountsByDate: lineRunCounts,
      jumlahShift,
      pointFullRun,
    });

    const cappedPoints = Math.min(totalPoints, settings.pm_weekly_total_days || 7);
    // Poin mentah (tanpa cap) disimpan terpisah khusus buat menilai ketepatan
    // (lihat migration 1700000031000).
    await pmLineQueries.updateHelper(line.id, {
      akumulasi_poin_weekly: cappedPoints,
      akumulasi_poin_weekly_raw: totalPoints,
      akumulasi_poin_weekly_raw_prev: totalPointsPrev,
    });
    updatedCount += 1;
  }

  logger.info(`Recompute PM Weekly accrual selesai (${updatedCount} Line)`);
  return { skipped: false, error: false, linesUpdated: updatedCount };
}

module.exports = { recomputeAllLines };
