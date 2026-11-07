// src/utils/pmPointFormula.js
//
// Formula poin PM Monthly/Weekly per TANGGAL - diextract jadi util murni terpisah dari
// pmMonthlyAccrualService.js / pmWeeklyAccrualService.js supaya:
//   1. Formula-nya SATU sumber kebenaran (nggak duplikat di 2 file)
//   2. Gampang di-unit-test tanpa perlu mock DB/ConMas sama sekali
//
// ATURAN (7 Nov 2026, menggantikan versi proporsional ke lines.jumlah_shift dari migration 1700000022000):
// Line bisa berpindah 2 shift <-> 3 shift. Versi lama membagi dengan jumlah_shift Line SAAT INI dan
// recompute-nya menyapu ulang seluruh hari sejak PM terakhir, jadi begitu master diubah 2 -> 3 hari-hari
// lama yang cuma jalan 2 shift mendadak dinilai 2/3 hari. Sekarang yang dilihat HANYA data yang masuk
// di tanggal itu, tidak peduli Line-nya 2 atau 3 shift:
//   0 data   -> 0 hari
//   1 data   -> 0,5 hari
//   >=2 data -> 1 hari (2 data dan 3 data sama-sama 1 hari, tidak pernah lebih)

/** Jumlah data (shift-entry) dalam 1 tanggal yang dihitung 1 hari penuh. */
const FULL_DAY_RUN_COUNT = 2;

/**
 * Poin buat 1 tanggal.
 *
 * @param {number} runCount    Berapa data (shift-entry output>0) masuk di tanggal itu (dari ConMas)
 * @param {number} pointFullRun Poin untuk 1 hari penuh (pm_monthly_point_full_run / pm_weekly_point_full_run)
 * @returns {number} 0 (tanpa data), setengah pointFullRun (1 data), atau pointFullRun (>= 2 data).
 *                   Data berlebih (misal 3 shift atau anomali ConMas) tidak pernah > 1 hari.
 */
function computeDailyPoints(runCount, pointFullRun) {
  const runs = Number(runCount);
  if (!Number.isFinite(runs) || runs <= 0) return 0;
  const ratio = Math.min(runs / FULL_DAY_RUN_COUNT, 1);
  return ratio * pointFullRun;
}

module.exports = { computeDailyPoints, FULL_DAY_RUN_COUNT };
