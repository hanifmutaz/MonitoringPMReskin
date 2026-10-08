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
const db = require('../config/db');
const { recordAudit } = require('../utils/auditLog');
const pmMonthlyAccrualService = require('./pmMonthlyAccrualService');
const pmWeeklyAccrualService = require('./pmWeeklyAccrualService');
const { isWithinPmCutoff, isToleranceApplicable } = require('../utils/pmOnTimeRule');

async function getThresholds() {
  const s = await settingsService.getSettings([
    'pm_monthly_point_cap',
    'pm_monthly_danger_days',
    'pm_monthly_warning_days',
    'pm_weekly_total_days',
    'pm_weekly_danger_days',
    'pm_weekly_warning_days',
    'pm_ontime_cutoff_time',
  ]);
  return {
    monthlyCap: s.pm_monthly_point_cap,
    monthlyDangerDays: s.pm_monthly_danger_days,
    monthlyWarningDays: s.pm_monthly_warning_days,
    weeklyTotalDays: s.pm_weekly_total_days,
    weeklyDangerDays: s.pm_weekly_danger_days,
    weeklyWarningDays: s.pm_weekly_warning_days,
    cutoffTime: s.pm_ontime_cutoff_time,
  };
}

function statusFromRemainingDays(remainingDays, dangerDays, warningDays) {
  if (remainingDays === null) return 'DANGER'; // belum pernah PM sama sekali -> butuh perhatian
  if (remainingDays <= dangerDays) return 'DANGER';
  if (remainingDays < warningDays) return 'WARNING';
  return 'OK';
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Satu siklus (Monthly ATAU Weekly): Sisa Hari, Status, toleransi, estimasi.
 *
 * Sisa Hari dihitung dari poin MENTAH (tanpa cap) kalau tersedia, jadi bisa
 * NEGATIF = sudah lewat jatuh tempo (telat). Sebelumnya dipakai poin ter-cap
 * sehingga sisa hari mentok 0 dan "jatuh tempo hari ini" tidak bisa dibedakan
 * dari "sudah telat" - padahal penilaian ketepatan memakai poin mentah.
 *
 * Toleransi jam batas (pm_ontime_cutoff_time): kalau cap baru terlewati di hari
 * terakhir yang dihitung dan sekarang masih sebelum jam batas, PM yang disubmit
 * sekarang dinilai TEPAT WAKTU -> ditampilkan sebagai jatuh tempo (0), bukan telat.
 */
function computeCycle({ lastDate, cappedPoints, raw, rawPrev, cap, dangerDays, warningDays, cutoffTime, nowHHMM }) {
  if (!lastDate) {
    return { sisaHari: null, status: 'DANGER', toleransi: false, estimasi: null };
  }
  const rawNum = raw === null || raw === undefined ? null : Number(raw);
  const effectivePoints = rawNum !== null ? rawNum : cappedPoints;
  const toleransi = isToleranceApplicable({
    raw: rawNum,
    rawPrev: rawPrev === null || rawPrev === undefined ? null : Number(rawPrev),
    cap,
    withinCutoff: isWithinPmCutoff(nowHHMM, cutoffTime),
  });
  const sisaHari = toleransi ? 0 : round1(cap - effectivePoints);
  return {
    sisaHari,
    status: statusFromRemainingDays(sisaHari, dangerDays, warningDays),
    toleransi,
    // Estimasi tanggal PM = hari ini + sisa hari (sudah lewat/hari ini -> hari ini).
    // Asumsi Line running penuh tiap hari; Line yang sering libur akan lebih mundur.
    estimasi: dateUtils.addDaysToToday(Math.max(sisaHari, 0)),
  };
}

function computeLineStatus(row, thresholds, nowHHMM = dateUtils.nowTimeString()) {
  const akumulasiPoinWeekly = Number(row.akumulasi_poin_weekly) || 0;
  const akumulasiPoin = Number(row.akumulasi_poin_monthly) || 0;

  const weekly = computeCycle({
    lastDate: row.tgl_pm_weekly_terakhir,
    cappedPoints: akumulasiPoinWeekly,
    raw: row.akumulasi_poin_weekly_raw,
    rawPrev: row.akumulasi_poin_weekly_raw_prev,
    cap: thresholds.weeklyTotalDays,
    dangerDays: thresholds.weeklyDangerDays,
    warningDays: thresholds.weeklyWarningDays,
    cutoffTime: thresholds.cutoffTime,
    nowHHMM,
  });
  const monthly = computeCycle({
    lastDate: row.tgl_pm_monthly_terakhir,
    cappedPoints: akumulasiPoin,
    raw: row.akumulasi_poin_monthly_raw,
    rawPrev: row.akumulasi_poin_monthly_raw_prev,
    cap: thresholds.monthlyCap,
    dangerDays: thresholds.monthlyDangerDays,
    warningDays: thresholds.monthlyWarningDays,
    cutoffTime: thresholds.cutoffTime,
    nowHHMM,
  });

  const rawOrCapped = (raw, capped) => (raw === null || raw === undefined ? capped : round1(Number(raw)));

  return {
    line_id: row.line_id,
    line_name: row.line_name,
    tgl_pm_monthly_terakhir: dateUtils.formatDate(row.tgl_pm_monthly_terakhir),
    akumulasi_poin_monthly: akumulasiPoin,
    akumulasi_poin_monthly_raw: rawOrCapped(row.akumulasi_poin_monthly_raw, akumulasiPoin),
    sisa_hari_monthly: monthly.sisaHari,
    status_monthly: monthly.status,
    estimasi_pm_monthly: monthly.estimasi,
    toleransi_monthly: monthly.toleransi,
    tgl_pm_weekly_terakhir: dateUtils.formatDate(row.tgl_pm_weekly_terakhir),
    akumulasi_poin_weekly: akumulasiPoinWeekly,
    akumulasi_poin_weekly_raw: rawOrCapped(row.akumulasi_poin_weekly_raw, akumulasiPoinWeekly),
    sisa_hari_weekly: weekly.sisaHari,
    status_weekly: weekly.status,
    estimasi_pm_weekly: weekly.estimasi,
    toleransi_weekly: weekly.toleransi,
    toleransi_sampai: thresholds.cutoffTime || null,
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

/**
 * Admin koreksi "Tgl PM Monthly/Weekly Terakhir" langsung dari Monitoring.
 * - Tulis ke pm_monthly_helper + audit log (tgl lama, tgl baru, alasan, siapa)
 *   dalam SATU transaksi.
 * - Setelah commit, poin akumulasi di-recompute dari baseline baru (job
 *   accrual idempotent). Kalau ConMas belum dikonfigurasi/error, tanggal
 *   tetap tersimpan tapi poin belum ikut - dilaporkan lewat `poin_recomputed`.
 * - Riwayat PM (pm_monthly_history) TIDAK diubah; ini koreksi baseline.
 */
async function updateLastPmDate({ lineId, jenisPm, tgl, alasan, userId }) {
  const client = await db.getClient();
  let helperAfter;
  try {
    await client.query('BEGIN');

    const line = await pmLineQueries.findLineById(lineId, client);
    if (!line) throw AppError.notFound('Line tidak ditemukan');

    await pmLineQueries.ensureHelperExists(lineId, client);
    const helperBefore = await pmLineQueries.findHelperByLine(lineId, client);

    const column = jenisPm === 'WEEKLY' ? 'tgl_pm_weekly_terakhir' : 'tgl_pm_monthly_terakhir';
    const tglLama = dateUtils.formatDate(helperBefore[column]);
    if (tglLama === tgl) {
      throw AppError.badRequest('Validasi gagal', { tgl: 'Tanggal sama dengan yang sekarang' });
    }

    helperAfter = await pmLineQueries.updateHelper(lineId, { [column]: tgl }, client);

    await recordAudit(
      {
        tableName: 'pm_monthly_helper',
        recordId: lineId,
        action: 'UPDATE',
        oldValue: { [column]: tglLama },
        newValue: { [column]: tgl },
        userId,
        actionDetail: `Koreksi ${column} Line ${line.line_name}: ${tglLama || '-'} -> ${tgl}. Alasan: ${alasan.trim()}`,
      },
      client
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  let recomputed = false;
  try {
    const accrual = jenisPm === 'WEEKLY' ? pmWeeklyAccrualService : pmMonthlyAccrualService;
    const result = await accrual.recomputeAllLines();
    recomputed = !result.skipped && !result.error;
  } catch (err) {
    recomputed = false;
  }

  const rows = await pmLineQueries.findAllStatus({ lineId });
  const thresholds = await getThresholds();
  return { ...computeLineStatus(rows[0] || helperAfter, thresholds), poin_recomputed: recomputed };
}

module.exports = { getPmLineStatus, computeLineStatus, getThresholds, statusFromRemainingDays, updateLastPmDate };