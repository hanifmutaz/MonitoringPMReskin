// src/utils/ketepatanStart.js
//
// Setting ketepatan_start_date (migration 1700000034000): event PM sebelum tanggal
// ini tidak ikut dihitung di Ketepatan PM. Kosong/tidak valid = nonaktif.

/** Murni: ambil tanggal yang lebih akhir antara awal periode & tanggal mulai (YYYY-MM-DD, bisa dibandingkan sebagai string). */
function clampFrom(periodFrom, startDate) {
  if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return periodFrom;
  return startDate > periodFrom ? startDate : periodFrom;
}

module.exports = { clampFrom };
