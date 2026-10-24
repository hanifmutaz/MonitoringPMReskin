// src/utils/lineIdle.js
//
// Fungsi MURNI (tanpa DB) untuk status "Line tidak running" dan kewajiban
// cleaning-nya. Dipisah dari service supaya bisa di-unit-test langsung
// (pola sama dengan determineOnTime / computeCycle).
//
// Definisi:
//   - Tanggal running terakhir = tanggal terakhir ada output (> 0) di production_cache.
//     Kalau Line belum pernah punya output, dipakai tanggal Line dibuat sebagai
//     titik awal (supaya Line baru yang belum jalan tidak langsung dianggap idle
//     sejak "selamanya", dan tetap bisa jatuh tempo cleaning-nya).
//   - Hari tidak running = hari ini - tanggal running terakhir.
//     Line dianggap TIDAK RUNNING kalau hari tidak running >= minDays.
//   - Cleaning: dihitung dari cleaning terakhir; kalau belum pernah, dari hari
//     pertama Line berhenti running (tanggal running terakhir + 1).
//     Jatuh tempo kalau hari sejak baseline >= intervalDays.

const dateUtils = require('./dateUtils');

/**
 * @param {object} row
 * @param {string|null} row.last_run_date - 'YYYY-MM-DD' atau null
 * @param {string|null} row.created_date - 'YYYY-MM-DD' (fallback bila belum pernah running)
 * @param {string|null} row.last_cleaning_date - 'YYYY-MM-DD' atau null
 * @param {{minDays: number, intervalDays: number}} cfg
 * @param {string} todayStr - 'YYYY-MM-DD'
 * @returns {{
 *   is_idle: boolean, idle_days: number|null, last_run_date: string|null, never_ran: boolean,
 *   idle_since: string|null, last_cleaning_date: string|null,
 *   cleaning_baseline_date: string|null, cleaning_due_date: string|null,
 *   days_to_cleaning: number|null, cleaning_required: boolean
 * }}
 */
function computeIdleStatus(row, cfg, todayStr) {
  const neverRan = !row.last_run_date;
  const anchor = row.last_run_date || row.created_date || null;
  if (!anchor) {
    return {
      is_idle: false,
      idle_days: null,
      last_run_date: null,
      never_ran: true,
      idle_since: null,
      last_cleaning_date: row.last_cleaning_date || null,
      cleaning_baseline_date: null,
      cleaning_due_date: null,
      days_to_cleaning: null,
      cleaning_required: false,
    };
  }

  const idleDays = Math.max(dateUtils.daysBetween(anchor, todayStr), 0);
  const isIdle = idleDays >= cfg.minDays;

  // Hari pertama tidak running: sehari setelah running terakhir.
  const idleSince = isIdle ? addDays(anchor, neverRan ? 0 : 1) : null;

  let baseline = null;
  let dueDate = null;
  let daysToCleaning = null;
  let cleaningRequired = false;
  if (isIdle) {
    baseline = row.last_cleaning_date || idleSince;
    dueDate = addDays(baseline, cfg.intervalDays);
    daysToCleaning = dateUtils.daysBetween(todayStr, dueDate); // negatif = sudah lewat
    cleaningRequired = daysToCleaning <= 0;
  }

  return {
    is_idle: isIdle,
    idle_days: idleDays,
    last_run_date: row.last_run_date || null,
    never_ran: neverRan,
    idle_since: idleSince,
    last_cleaning_date: row.last_cleaning_date || null,
    cleaning_baseline_date: baseline,
    cleaning_due_date: dueDate,
    days_to_cleaning: daysToCleaning,
    cleaning_required: cleaningRequired,
  };
}

function addDays(dateStr, days) {
  return dateUtils.parseDbDate(dateStr).add(days, 'day').format(dateUtils.DATE_FORMAT);
}

module.exports = { computeIdleStatus };
