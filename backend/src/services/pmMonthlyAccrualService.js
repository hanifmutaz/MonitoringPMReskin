// src/services/pmMonthlyAccrualService.js
//
// Bagian YANG DIBLOKIR dari Langkah 7 (PM Monthly) akhirnya bisa
// diselesaikan setelah tabel ConMas dikonfirmasi (18 Jul 2026).
//
// "Line running berapa kali/hari" = COUNT baris (shift entry) di
// view_report_25415 per Line+tanggal yang punya output > 0 di slot
// manapun (lihat conmasQueries.fetchDailyRunCounts).
//
// Formula DIUBAH (24 Sep 2026) - lihat migration 1700000022000. Versi lama
// pakai threshold binary full/half GLOBAL (pm_monthly_min_run_count_full),
// jadi Line 3-shift yang jalan penuh (running=3) dapet poin sama persis
// dengan Line 2-shift yang jalan penuh (running=2) - keausan Line 3-shift
// under-counted. Formula baru PROPORSIONAL ke jumlah_shift Line itu sendiri:
//
//   poin_hari_itu = MIN(running / line.jumlah_shift, 1) * pm_monthly_point_full_run
//   (running == 0 -> 0 poin, tidak ada baris di ConMas hari itu)
//
//   akumulasi dihitung dari (Tgl PM Monthly Terakhir, hari ini], di-cap
//
// pm_monthly_min_run_count_full & pm_monthly_point_half_run TIDAK dipakai
// lagi oleh formula ini, dan sudah DIHAPUS dari app_settings (lihat
// migration 1700000023000) supaya Settings page tidak menampilkan kontrol
// yang keliatan bisa diubah tapi sebenarnya tidak ngefek.
//
// STRATEGI: full RECOMPUTE tiap kali job jalan (bukan increment harian).
// Sengaja dipilih karena idempotent — aman dijalankan berkali-kali
// (mis. kalau job sempat gagal/telat) tanpa resiko poin ke-double-count,
// dan konsisten dengan filosofi "Real-time query dulu" yang sudah dipakai
// di PM Part (06_ENVIRONMENT_AND_BOOTSTRAP.md §4) — bukan pola cache
// yang di-increment dan gampang drift dari kondisi asli.

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
    logger.warn('Recompute PM Monthly accrual dilewati - kredensial CONMAS_DB_* belum diisi');
    return { skipped: true };
  }

  const settings = await settingsService.getSettings([
    'sync_lookback_days',
    'pm_monthly_point_cap',
    'pm_monthly_point_full_run',
  ]);

  let runCountRows;
  try {
    runCountRows = await conmasQueries.fetchDailyRunCounts(settings.sync_lookback_days || 90);
  } catch (err) {
    logger.error('Recompute PM Monthly accrual gagal - query ConMas error', err);
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

    if (!helper || !helper.tgl_pm_monthly_terakhir) {
      // Belum pernah ada PM Monthly sama sekali -> belum ada baseline buat
      // dihitung dari mana, konsisten dengan pmLineService (status DANGER
      // "belum pernah PM", bukan dianggap 0 poin dari epoch).
      continue;
    }

    const baseline = dateUtils.parseDbDate(helper.tgl_pm_monthly_terakhir);
    const today = dateUtils.today();
    const lineRunCounts = byLine.get(line.line_name) || new Map();
    const jumlahShift = line.jumlah_shift || 2;
    const pointFullRun = settings.pm_monthly_point_full_run ?? 1;

    let totalPoints = 0;
    let cursor = baseline.add(1, 'day');
    while (!cursor.isAfter(today)) {
      const dateStr = cursor.format('YYYY-MM-DD');
      const runCount = lineRunCounts.get(dateStr) || 0;

      // Proporsional: running penuh sesuai jumlah_shift Line -> full point;
      // running sebagian -> pecahan sebanding (bukan lagi binary full/half).
      totalPoints += computeDailyPoints(runCount, jumlahShift, pointFullRun);
      cursor = cursor.add(1, 'day');
    }

    const cappedPoints = Math.min(totalPoints, settings.pm_monthly_point_cap || 30);
    await pmLineQueries.updateHelper(line.id, { akumulasi_poin_monthly: cappedPoints });
    updatedCount += 1;
  }

  logger.info(`Recompute PM Monthly accrual selesai (${updatedCount} Line)`);
  return { skipped: false, error: false, linesUpdated: updatedCount };
}

module.exports = { recomputeAllLines };
