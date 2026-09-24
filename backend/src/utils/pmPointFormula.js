// src/utils/pmPointFormula.js
//
// Formula poin PM Monthly/Weekly yang proporsional ke jumlah_shift Line
// (migration 1700000022000) - diextract jadi util murni terpisah dari
// pmMonthlyAccrualService.js / pmWeeklyAccrualService.js supaya:
//   1. Formula-nya SATU sumber kebenaran (nggak duplikat di 2 file)
//   2. Gampang di-unit-test tanpa perlu mock DB/ConMas sama sekali

/**
 * Poin buat 1 hari, proporsional ke jumlah shift Line.
 *
 * @param {number} runCount   Berapa kali Line running hari itu (dari
 *                             ConMas, COUNT baris shift-entry output>0)
 * @param {number} jumlahShift Jumlah shift normal Line ini (2 atau 3)
 * @param {number} pointFullRun Poin penuh kalau running = jumlahShift
 * @returns {number} Poin hari itu, di-cap max pointFullRun (running lebih
 *                    dari jumlahShift - misal data ConMas anomali - tidak
 *                    menghasilkan poin lebih dari 1 hari penuh)
 */
function computeDailyPoints(runCount, jumlahShift, pointFullRun) {
  if (!jumlahShift || jumlahShift <= 0) return 0;
  const ratio = Math.min(runCount / jumlahShift, 1);
  return ratio * pointFullRun;
}

module.exports = { computeDailyPoints };
