// src/utils/pmOnTimeRule.js
//
// Aturan toleransi "hari jatuh tempo diperpanjang sampai jam batas" untuk
// penilaian ketepatan PM Monthly/Weekly (lihat migration 1700000033000).
//
// Murni (tanpa DB/waktu sistem) supaya mudah di-unit-test.

/**
 * @param {string} nowHHMM    - jam sekarang WIB 'HH:mm'
 * @param {string} cutoffHHMM - setting pm_ontime_cutoff_time 'HH:mm'
 * @returns {boolean} true kalau sekarang masih SEBELUM jam batas.
 *   Jam batas kosong/tidak valid/'00:00' = toleransi nonaktif.
 */
function isWithinPmCutoff(nowHHMM, cutoffHHMM) {
  if (typeof cutoffHHMM !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffHHMM)) return false;
  if (cutoffHHMM === '00:00') return false;
  return nowHHMM < cutoffHHMM;
}

/**
 * Toleransi berlaku kalau: poin mentah sudah melewati cap, TAPI baru terlewati
 * di hari terakhir yang dihitung (poin mentah sebelum hari itu masih <= cap),
 * dan sekarang masih sebelum jam batas.
 *
 * @param {{raw:number|null, rawPrev:number|null, cap:number, withinCutoff:boolean}} p
 */
function isToleranceApplicable({ raw, rawPrev, cap, withinCutoff }) {
  if (!withinCutoff) return false;
  if (raw === null || raw === undefined || rawPrev === null || rawPrev === undefined) return false;
  return Number(raw) > cap && Number(rawPrev) <= cap;
}

module.exports = { isWithinPmCutoff, isToleranceApplicable };
