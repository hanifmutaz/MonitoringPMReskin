// src/services/pmLineHistoryService.js
//
// Reset rule MASTER DOCUMENT Bagian 2.D — TIDAK DIUBAH:
//   jenis_pm = MONTHLY -> update tgl_pm_monthly_terakhir, DAN (jika
//              auto_reset_weekly_on_monthly efektif = true) update juga
//              tgl_pm_weekly_terakhir.
//   jenis_pm = WEEKLY  -> update tgl_pm_weekly_terakhir SAJA.
//
// "auto_reset_weekly_on_monthly efektif" mengikuti deviasi terdokumentasi
// yang sudah disetujui: override per-Line (lines.auto_reset_weekly_on_monthly)
// kalau di-set eksplisit (bukan NULL), fallback ke setting global di
// app_settings kalau NULL.
//
// akumulasi_poin_monthly di-reset ke 0 saat PM Monthly baru dieksekusi,
// karena basis perhitungannya "akumulasi poin SEJAK Tgl PM Monthly
// Terakhir" (Bagian 2.B) — begitu tanggal terakhir berubah ke hari ini,
// akumulasi dari baseline baru itu otomatis mulai dari 0.

const db = require('../config/db');
const pmLineQueries = require('../sql/pmLineQueries');
const pmLineHistoryQueries = require('../sql/pmLineHistoryQueries');
const settingsService = require('./settingsService');
const dateUtils = require('../utils/dateUtils');
const { recordAudit } = require('../utils/auditLog');
const AppError = require('../utils/AppError');

/**
 * Fungsi MURNI (tanpa DB) yang implementasikan reset rule Bagian 2.D —
 * dipisah dari submitPmLineHistory() supaya bisa di-unit-test langsung
 * (06_ENVIRONMENT_AND_BOOTSTRAP.md §5: "wajib ditest ... reset rule
 * Monthly -> Weekly, termasuk kondisi toggle on/off").
 *
 * @param {'MONTHLY'|'WEEKLY'} jenisPm
 * @param {string} tglInput - 'YYYY-MM-DD'
 * @param {boolean|null|undefined} lineOverride - lines.auto_reset_weekly_on_monthly
 * @param {boolean} globalDefault - app_settings.auto_reset_weekly_on_monthly
 * @returns {object} field yang harus di-UPDATE ke pm_monthly_helper
 */
function determineHelperUpdate(jenisPm, tglInput, lineOverride, globalDefault) {
  if (jenisPm === 'WEEKLY') {
    return { tgl_pm_weekly_terakhir: tglInput };
  }

  // MONTHLY
  const effectiveAutoReset =
    lineOverride !== null && lineOverride !== undefined ? lineOverride : globalDefault === true;

  const fields = {
    tgl_pm_monthly_terakhir: tglInput,
    akumulasi_poin_monthly: 0,
  };
  if (effectiveAutoReset) {
    fields.tgl_pm_weekly_terakhir = tglInput;
  }
  return fields;
}

async function listPmLineHistory({ lineId, jenis, dateFrom, dateTo, page, limit }) {
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 20;
  return pmLineHistoryQueries.findAll({ lineId, jenis, dateFrom, dateTo, page: pageNum, limit: limitNum });
}

/**
 * Fungsi MURNI (tanpa DB) yang nentuin ketepatan PM Monthly/Weekly, dievaluasi
 * terhadap kondisi helper SEBELUM update (bukan sesudah, karena update
 * me-reset baseline-nya). Dipisah dari submitPmLineHistory() supaya bisa
 * di-unit-test langsung, sama pola dengan determineHelperUpdate() di atas.
 *
 *   WEEKLY  -> tepat waktu jika (tgl_input - tgl_pm_weekly_terakhir lama)
 *              <= pm_weekly_total_days (siklus kalender murni, lihat
 *              Bagian 2.C - tidak di-cap, jadi bisa negatif/lewat).
 *   MONTHLY -> tepat waktu jika akumulasi_poin_monthly SEBELUM reset ini
 *              masih < pm_monthly_point_cap. Poin di-cap di angka itu
 *              (Bagian 2.B), jadi begitu poin mentok cap berarti Line
 *              sudah due dan PM belum juga dijalankan -> telat, terlepas
 *              berapa lama lagi menunggu setelah itu.
 *   Line yang belum pernah di-PM sama sekali (tgl terakhir null) dianggap
 *   tepat waktu untuk PM pertamanya - belum ada due date yang bisa dilewati.
 *
 * @param {'MONTHLY'|'WEEKLY'} jenisPm
 * @param {string} tglInput - 'YYYY-MM-DD'
 * @param {{tgl_pm_monthly_terakhir: string|null, tgl_pm_weekly_terakhir: string|null, akumulasi_poin_monthly: number}|null} helperBefore
 * @param {{monthlyCap: number, weeklyTotalDays: number}} thresholds
 * @returns {boolean}
 */
function determineOnTime(jenisPm, tglInput, helperBefore, thresholds) {
  if (jenisPm === 'WEEKLY') {
    if (!helperBefore?.tgl_pm_weekly_terakhir) return true;
    const totalHari = dateUtils.daysBetween(helperBefore.tgl_pm_weekly_terakhir, tglInput);
    return totalHari <= thresholds.weeklyTotalDays;
  }

  // MONTHLY
  if (!helperBefore?.tgl_pm_monthly_terakhir) return true;
  return Number(helperBefore.akumulasi_poin_monthly) < thresholds.monthlyCap;
}

async function getOnTimeThresholds() {
  const s = await settingsService.getSettings(['pm_monthly_point_cap', 'pm_weekly_total_days']);
  return { monthlyCap: s.pm_monthly_point_cap, weeklyTotalDays: s.pm_weekly_total_days };
}

async function submitPmLineHistory(data, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const line = await pmLineQueries.findLineById(data.line_id, client);
    if (!line) {
      throw AppError.badRequest('Validasi gagal', { line_id: 'Line tidak ditemukan' });
    }

    await pmLineQueries.ensureHelperExists(data.line_id, client);

    const [globalDefault, onTimeThresholds, helperBefore] = await Promise.all([
      settingsService.getSetting('auto_reset_weekly_on_monthly'),
      getOnTimeThresholds(),
      pmLineQueries.findHelperByLine(data.line_id, client),
    ]);

    const helperUpdateFields = determineHelperUpdate(
      data.jenis_pm,
      data.tgl_input,
      line.auto_reset_weekly_on_monthly,
      globalDefault
    );

    await pmLineQueries.updateHelper(data.line_id, helperUpdateFields, client);

    const onTime = determineOnTime(data.jenis_pm, data.tgl_input, helperBefore, onTimeThresholds);
    const createdHistory = await pmLineHistoryQueries.create({ ...data, user_id: userId, on_time: onTime }, client);

    // Audit untuk history PM Line (wajib - Development Rules §22). Efek reset
    // ke pm_monthly_helper TIDAK diaudit terpisah — tabel itu bukan bagian
    // dari daftar wajib audit §22 (lines/parts/part_cl_mapping/app_settings/
    // users/pm_part_history/pm_monthly_history saja); perubahan pada
    // pm_monthly_helper sudah cukup terlacak lewat row pm_monthly_history ini.
    await recordAudit(
      {
        tableName: 'pm_monthly_history',
        recordId: createdHistory.id,
        action: 'CREATE',
        oldValue: null,
        newValue: createdHistory,
        userId,
      },
      client
    );

    await client.query('COMMIT');
    return createdHistory;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function toPercentage(total, onTimeCount) {
  if (!total) return null; // belum ada data yang bisa dihitung tahun ini
  return Math.round((onTimeCount / total) * 1000) / 10; // 1 desimal
}

function emptyJenisResult() {
  return { total: 0, on_time_count: 0, percentage: null };
}

// --- Ketepatan PM Monthly/Weekly, tahun berjalan (lihat migration 1700000012000) ---
// Monthly & Weekly SENGAJA dipisah (bukan digabung 1 angka) - dua jadwal
// yang berbeda sifat (poin ter-cap vs kalender murni), digabung jadi 1 angka
// malah kabur maknanya.

async function getKetepatanSummary() {
  const dateFrom = dateUtils.startOfYearString();
  const rows = await pmLineHistoryQueries.getKetepatanOverall({ dateFrom });

  const result = { monthly: emptyJenisResult(), weekly: emptyJenisResult() };
  for (const r of rows) {
    const total = Number(r.total);
    const onTimeCount = Number(r.on_time_count);
    const key = r.jenis_pm === 'MONTHLY' ? 'monthly' : 'weekly';
    result[key] = { total, on_time_count: onTimeCount, percentage: toPercentage(total, onTimeCount) };
  }
  return result;
}

async function getKetepatanPerLine() {
  const dateFrom = dateUtils.startOfYearString();
  const rows = await pmLineHistoryQueries.getKetepatanPerLine({ dateFrom });

  const perLine = new Map();
  for (const r of rows) {
    if (!perLine.has(r.line_id)) {
      perLine.set(r.line_id, {
        line_id: r.line_id,
        line_name: r.line_name,
        monthly: emptyJenisResult(),
        weekly: emptyJenisResult(),
      });
    }
    const total = Number(r.total);
    const onTimeCount = Number(r.on_time_count);
    const key = r.jenis_pm === 'MONTHLY' ? 'monthly' : 'weekly';
    perLine.get(r.line_id)[key] = { total, on_time_count: onTimeCount, percentage: toPercentage(total, onTimeCount) };
  }
  return Array.from(perLine.values()).sort((a, b) => a.line_name.localeCompare(b.line_name));
}

module.exports = {
  listPmLineHistory,
  submitPmLineHistory,
  determineHelperUpdate,
  determineOnTime,
  getKetepatanSummary,
  getKetepatanPerLine,
};
