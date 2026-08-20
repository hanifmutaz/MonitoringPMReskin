// src/services/pmLineService.js
//
// Formula MASTER DOCUMENT Bagian 2.B (Monthly) — TIDAK DIUBAH. Bagian 2.C
// (Weekly) DIUBAH sejak migration 1700000019000 (diminta eksplisit lewat
// chat) dari "murni kalender" menjadi BERBASIS AKUMULASI POIN, pola yang
// sama persis dengan Monthly:
//
//   Weekly (berbasis akumulasi poin, di-cap - SAMA POLA dengan Monthly):
//     Sisa Hari Weekly  = pm_weekly_total_days (dipakai sebagai cap poin) - akumulasi_poin_weekly
//     Estimasi PM Weekly = Hari Ini + Sisa Hari Weekly
//     Status: <= pm_weekly_danger_days -> DANGER, < pm_weekly_warning_days -> WARNING, else OK
//
//   Monthly (berbasis akumulasi poin, di-cap):
//     Sisa Hari Monthly = pm_monthly_point_cap - akumulasi_poin_monthly
//     Estimasi PM Monthly = Hari Ini + Sisa Hari Monthly
//     Status: <= pm_monthly_danger_days -> DANGER, < pm_monthly_warning_days -> WARNING, else OK
//
// CATATAN: akumulasi_poin_monthly & akumulasi_poin_weekly di sini DIBACA APA
// ADANYA dari cache pm_monthly_helper. Job yang MENAMBAH poin keduanya
// (berdasarkan "berapa kali Line running per hari", Line yang TIDAK RUNNING
// di suatu hari TIDAK menambah poin - jadi TIDAK ADA pengurangan sisa hari)
// ada di services/pmMonthlyAccrualService.js, dijalankan otomatis lewat
// jobs/conmasSyncJob.js (cron) setelah struktur data ConMas
// (production_cache per slot/shift) dikonfirmasi tersedia — lihat
// PROJECT_SCOPE.md untuk riwayat status Fase 3.

const pmLineQueries = require('../sql/pmLineQueries');
const settingsService = require('./settingsService');
const pmLineHistoryService = require('./pmLineHistoryService');
const dateUtils = require('../utils/dateUtils');
const AppError = require('../utils/AppError');

async function getThresholds() {
  const s = await settingsService.getSettings([
    'pm_monthly_point_cap',
    'pm_monthly_danger_days',
    'pm_monthly_warning_days',
    'pm_weekly_total_days',
    'pm_weekly_danger_days',
    'pm_weekly_warning_days',
  ]);
  return {
    monthlyCap: s.pm_monthly_point_cap,
    monthlyDangerDays: s.pm_monthly_danger_days,
    monthlyWarningDays: s.pm_monthly_warning_days,
    weeklyTotalDays: s.pm_weekly_total_days,
    weeklyDangerDays: s.pm_weekly_danger_days,
    weeklyWarningDays: s.pm_weekly_warning_days,
  };
}

function statusFromRemainingDays(remainingDays, dangerDays, warningDays) {
  if (remainingDays === null) return 'DANGER'; // belum pernah PM sama sekali -> butuh perhatian
  if (remainingDays <= dangerDays) return 'DANGER';
  if (remainingDays < warningDays) return 'WARNING';
  return 'OK';
}

function computeLineStatus(row, thresholds) {
  // --- Weekly (poin, SAMA POLA dengan Monthly - lihat komentar header) ---
  const weeklyLastDate = row.tgl_pm_weekly_terakhir;
  const akumulasiPoinWeekly = Number(row.akumulasi_poin_weekly) || 0;
  let sisaHariWeekly = null;
  let statusWeekly = 'DANGER';
  if (weeklyLastDate) {
    sisaHariWeekly = thresholds.weeklyTotalDays - akumulasiPoinWeekly;
    statusWeekly = statusFromRemainingDays(sisaHariWeekly, thresholds.weeklyDangerDays, thresholds.weeklyWarningDays);
  }

  // --- Monthly ---
  const monthlyLastDate = row.tgl_pm_monthly_terakhir;
  const akumulasiPoin = Number(row.akumulasi_poin_monthly) || 0;
  let sisaHariMonthly = null;
  let statusMonthly = 'DANGER';
  if (monthlyLastDate) {
    sisaHariMonthly = thresholds.monthlyCap - akumulasiPoin;
    statusMonthly = statusFromRemainingDays(
      sisaHariMonthly,
      thresholds.monthlyDangerDays,
      thresholds.monthlyWarningDays
    );
  }

  return {
    line_id: row.line_id,
    line_name: row.line_name,
    tgl_pm_monthly_terakhir: dateUtils.formatDate(monthlyLastDate),
    akumulasi_poin_monthly: akumulasiPoin,
    sisa_hari_monthly: sisaHariMonthly,
    status_monthly: statusMonthly,
    tgl_pm_weekly_terakhir: dateUtils.formatDate(weeklyLastDate),
    akumulasi_poin_weekly: akumulasiPoinWeekly,
    sisa_hari_weekly: sisaHariWeekly,
    status_weekly: statusWeekly,
  };
}

async function getPmLineStatus({ lineId }) {
  const thresholds = await getThresholds();

  if (lineId) {
    const line = await pmLineQueries.findLineById(lineId);
    if (!line) throw AppError.notFound('Line tidak ditemukan');
    await pmLineQueries.ensureHelperExists(lineId);
  }

  const [rows, ketepatanPerLine] = await Promise.all([
    pmLineQueries.findAllStatus({ lineId }),
    // Ketepatan (tahun berjalan) - fitur terpisah dari status DANGER/WARNING/OK
    // di atas (formula Bagian 2.B/2.C TIDAK diubah), digabung di sini karena
    // hasilnya sama-sama "per Line" dan halaman Monitoring butuh keduanya
    // sekaligus dalam 1 baris tabel.
    pmLineHistoryService.getKetepatanPerLine(),
  ]);

  const ketepatanByLineId = new Map(ketepatanPerLine.map((k) => [k.line_id, k]));

  return rows.map((row) => {
    const status = computeLineStatus(row, thresholds);
    const ketepatan = ketepatanByLineId.get(row.line_id);
    return {
      ...status,
      ketepatan_monthly_percentage: ketepatan ? ketepatan.monthly.percentage : null,
      ketepatan_weekly_percentage: ketepatan ? ketepatan.weekly.percentage : null,
    };
  });
}

module.exports = { getPmLineStatus, computeLineStatus, getThresholds, statusFromRemainingDays };