// src/services/pmLineHistoryService.js
//
// Reset rule MASTER DOCUMENT Bagian 2.D — struktur TIDAK DIUBAH (kolom mana
// yang ke-reset saat MONTHLY/WEEKLY submit), TAPI sejak migration
// 1700000019000 akumulasi_poin_weekly IKUT DIRESET setiap kali kolom
// tgl_pm_weekly_terakhir-nya di-reset (sama alasan dengan
// akumulasi_poin_monthly di bawah - Weekly sekarang basis poin juga):
//   jenis_pm = MONTHLY -> update tgl_pm_monthly_terakhir + akumulasi_poin_monthly=0,
//              DAN (jika auto_reset_weekly_on_monthly efektif = true) update
//              juga tgl_pm_weekly_terakhir + akumulasi_poin_weekly=0.
//   jenis_pm = WEEKLY  -> update tgl_pm_weekly_terakhir + akumulasi_poin_weekly=0.
//
// "auto_reset_weekly_on_monthly efektif" mengikuti deviasi terdokumentasi
// yang sudah disetujui: override per-Line (lines.auto_reset_weekly_on_monthly)
// kalau di-set eksplisit (bukan NULL), fallback ke setting global di
// app_settings kalau NULL.
//
// akumulasi_poin_monthly/akumulasi_poin_weekly di-reset ke 0 saat PM
// Monthly/Weekly baru dieksekusi, karena basis perhitungannya "akumulasi
// poin SEJAK Tgl PM Terakhir" (Bagian 2.B, dan 2.C sejak migration
// 1700000019000) — begitu tanggal terakhir berubah ke hari ini, akumulasi
// dari baseline baru itu otomatis mulai dari 0.

const db = require('../config/db');
const pmLineQueries = require('../sql/pmLineQueries');
const pmLineHistoryQueries = require('../sql/pmLineHistoryQueries');
const settingsService = require('./settingsService');
const dateUtils = require('../utils/dateUtils');
const { recordAudit } = require('../utils/auditLog');
const { isWithinPmCutoff, isToleranceApplicable } = require('../utils/pmOnTimeRule');
const { clampFrom } = require('../utils/ketepatanStart');
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
 * @param {boolean} [skipWeeklyReset] - true = JANGAN ikut reset Weekly (PM Monthly PERTAMA dengan tanggal lampau:
 *   Weekly belum punya baseline, biar operator mengisi tanggal Weekly aslinya sendiri)
 * @returns {object} field yang harus di-UPDATE ke pm_monthly_helper
 */
function determineHelperUpdate(jenisPm, tglInput, lineOverride, globalDefault, skipWeeklyReset = false) {
  if (jenisPm === 'WEEKLY') {
    return {
      tgl_pm_weekly_terakhir: tglInput,
      akumulasi_poin_weekly: 0,
      akumulasi_poin_weekly_raw: 0,
      akumulasi_poin_weekly_raw_prev: 0,
    };
  }

  // MONTHLY
  const effectiveAutoReset =
    lineOverride !== null && lineOverride !== undefined ? lineOverride : globalDefault === true;

  const fields = {
    tgl_pm_monthly_terakhir: tglInput,
    akumulasi_poin_monthly: 0,
    akumulasi_poin_monthly_raw: 0,
    akumulasi_poin_monthly_raw_prev: 0,
  };
  if (effectiveAutoReset && !skipWeeklyReset) {
    fields.tgl_pm_weekly_terakhir = tglInput;
    fields.akumulasi_poin_weekly = 0;
    fields.akumulasi_poin_weekly_raw = 0;
    fields.akumulasi_poin_weekly_raw_prev = 0;
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
 *   WEEKLY  -> (SEJAK migration 1700000019000) tepat waktu jika
 *              akumulasi_poin_weekly SEBELUM reset ini masih <
 *              pm_weekly_total_days (dipakai sebagai cap poin - pola SAMA
 *              PERSIS dengan MONTHLY di bawah, cuma beda kolom/setting).
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
 * @param {{tgl_pm_monthly_terakhir: string|null, tgl_pm_weekly_terakhir: string|null, akumulasi_poin_monthly: number, akumulasi_poin_weekly: number}|null} helperBefore
 * @param {{monthlyCap: number, weeklyTotalDays: number, cutoffTime?: string}} thresholds
 * @param {string} [nowHHMM] - jam sekarang WIB 'HH:mm' (default: jam sistem; di-inject buat tes)
 * @returns {boolean}
 */
function determineOnTime(jenisPm, tglInput, helperBefore, thresholds, nowHHMM = dateUtils.nowTimeString()) {
  const isWeekly = jenisPm === 'WEEKLY';
  const lastDate = isWeekly ? helperBefore?.tgl_pm_weekly_terakhir : helperBefore?.tgl_pm_monthly_terakhir;
  if (!lastDate) return true; // PM pertama: belum ada due date yang bisa dilewati

  const cap = isWeekly ? thresholds.weeklyTotalDays : thresholds.monthlyCap;
  const rawPoints = isWeekly ? helperBefore.akumulasi_poin_weekly_raw : helperBefore.akumulasi_poin_monthly_raw;

  // Poin mentah (tanpa cap) tersedia: telat HANYA kalau sudah melewati cap.
  // poin == cap berarti jatuh tempo HARI INI -> PM hari ini masih tepat waktu.
  if (rawPoints !== null && rawPoints !== undefined) {
    if (Number(rawPoints) <= cap) return true;
    // Toleransi jam batas: hari jatuh tempo "diperpanjang" sampai pm_ontime_cutoff_time
    // di hari berikutnya (shift 1 -> shift 2 -> shift 1 tanpa jeda, PM baru bisa
    // dikerjakan setelah running). Berlaku hanya kalau cap baru terlewati di hari
    // terakhir yang dihitung (poin mentah sebelum hari itu masih <= cap).
    const rawPrev = isWeekly ? helperBefore.akumulasi_poin_weekly_raw_prev : helperBefore.akumulasi_poin_monthly_raw_prev;
    return isToleranceApplicable({
      raw: rawPoints,
      rawPrev,
      cap,
      withinCutoff: isWithinPmCutoff(nowHHMM, thresholds.cutoffTime),
    });
  }

  // Fallback (baris lama yang belum pernah di-recompute job accrual sejak
  // migration 1700000031000): aturan lama, poin ter-cap harus < cap.
  const cappedPoints = isWeekly ? helperBefore.akumulasi_poin_weekly : helperBefore.akumulasi_poin_monthly;
  return Number(cappedPoints) < cap;
}

/**
 * Tentukan tanggal PM yang dicatat. KPI ketepatan harus real, jadi tanggal
 * ditentukan SISTEM (hari ini WIB), bukan input operator - supaya tidak bisa
 * di-backdate. Satu-satunya pengecualian: PM PERTAMA untuk jenis itu (Tgl PM
 * Terakhir masih kosong, mis. Line baru dimasukkan) - operator boleh isi
 * tanggal PM aslinya karena belum ada baseline.
 * Koreksi tanggal setelahnya hanya lewat edit Admin (alasan wajib + audit log).
 *
 * @param {'MONTHLY'|'WEEKLY'} jenisPm
 * @param {string|undefined|null} requestedTgl - 'YYYY-MM-DD' dari client (boleh kosong)
 * @param {object|null} helperBefore
 * @param {string} todayStr - 'YYYY-MM-DD' (WIB, dari server)
 * @returns {string}
 */
function resolveTglInput(jenisPm, requestedTgl, helperBefore, todayStr) {
  const lastDate = jenisPm === 'WEEKLY' ? helperBefore?.tgl_pm_weekly_terakhir : helperBefore?.tgl_pm_monthly_terakhir;
  if (!lastDate) return requestedTgl || todayStr;
  return todayStr;
}

async function getOnTimeThresholds() {
  const s = await settingsService.getSettings(['pm_monthly_point_cap', 'pm_weekly_total_days', 'pm_ontime_cutoff_time']);
  return {
    monthlyCap: s.pm_monthly_point_cap,
    weeklyTotalDays: s.pm_weekly_total_days,
    cutoffTime: s.pm_ontime_cutoff_time,
  };
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

    const tglInput = resolveTglInput(data.jenis_pm, data.tgl_input, helperBefore, dateUtils.todayString());

    // PM Monthly PERTAMA dengan tanggal lampau (backdate) + Weekly belum punya baseline:
    // jangan ikut menimpa Weekly dengan tanggal itu, supaya Weekly masih bisa diisi
    // tanggal aslinya sendiri (aturan "PM pertama boleh isi tanggal").
    const skipWeeklyReset =
      data.jenis_pm === 'MONTHLY' &&
      !helperBefore?.tgl_pm_monthly_terakhir &&
      !helperBefore?.tgl_pm_weekly_terakhir &&
      tglInput !== dateUtils.todayString();

    const helperUpdateFields = determineHelperUpdate(
      data.jenis_pm,
      tglInput,
      line.auto_reset_weekly_on_monthly,
      globalDefault,
      skipWeeklyReset
    );

    await pmLineQueries.updateHelper(data.line_id, helperUpdateFields, client);

    const onTime = determineOnTime(data.jenis_pm, tglInput, helperBefore, onTimeThresholds);
    const createdHistory = await pmLineHistoryQueries.create(
      { ...data, tgl_input: tglInput, user_id: userId, on_time: onTime },
      client
    );

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

// period: 'year' (default, tahun berjalan) | 'month' (bulan kalender berjalan, WIB).
async function getKetepatanStartDate() {
  return settingsService.getSetting('ketepatan_start_date');
}

async function getKetepatanSummary({ period = 'year' } = {}) {
  const startDate = await getKetepatanStartDate();
  const range =
    period === 'month'
      ? { dateFrom: clampFrom(dateUtils.startOfMonthString(), startDate), dateTo: dateUtils.endOfMonthString() }
      : { dateFrom: clampFrom(dateUtils.startOfYearString(), startDate) };
  const rows = await pmLineHistoryQueries.getKetepatanOverall(range);

  const result = { monthly: emptyJenisResult(), weekly: emptyJenisResult() };
  for (const r of rows) {
    const total = Number(r.total);
    const onTimeCount = Number(r.on_time_count);
    const key = r.jenis_pm === 'MONTHLY' ? 'monthly' : 'weekly';
    result[key] = { total, on_time_count: onTimeCount, percentage: toPercentage(total, onTimeCount) };
  }
  return result;
}

// Tren N bulan terakhir (termasuk bulan ini) -> Map 'YYYY-MM' -> {monthly, weekly}.
// Bulan/jenis tanpa event tidak ada di Map (pemanggil yang mengisi kosongnya).
async function getKetepatanMonthlyTrend(months = 6) {
  const startDate = await getKetepatanStartDate();
  const rows = await pmLineHistoryQueries.getKetepatanByMonth({
    dateFrom: clampFrom(dateUtils.startOfMonthString(-(months - 1)), startDate),
    dateTo: dateUtils.endOfMonthString(),
  });
  const result = new Map();
  for (const r of rows) {
    if (!result.has(r.month)) result.set(r.month, { monthly: emptyJenisResult(), weekly: emptyJenisResult() });
    const total = Number(r.total);
    const onTimeCount = Number(r.on_time_count);
    const key = r.jenis_pm === 'MONTHLY' ? 'monthly' : 'weekly';
    result.get(r.month)[key] = { total, on_time_count: onTimeCount, percentage: toPercentage(total, onTimeCount) };
  }
  return result;
}

async function getKetepatanPerLine() {
  const dateFrom = clampFrom(dateUtils.startOfYearString(), await getKetepatanStartDate());
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
  resolveTglInput,
  getKetepatanSummary,
  getKetepatanMonthlyTrend,
  getKetepatanPerLine,
};