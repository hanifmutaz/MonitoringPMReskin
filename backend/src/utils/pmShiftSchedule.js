// src/utils/pmShiftSchedule.js
//
// Perhitungan poin yang sadar-shift untuk TANGGAL PM. Sebelumnya seluruh tanggal PM
// dibuang dari akrual, sehingga shift yang jalan SETELAH PM di tanggal yang sama
// (mis. PM jam 20:00, Shift 2 mulai 22:00) tidak pernah dihitung.
//
// Jam mulai shift (WIB). Laporan ConMas dicatat dengan tanggal HARI MULAI shift
// (dikonfirmasi pemilik project), jadi Shift malam 22:00 selalu masuk tanggal 22:00-nya.
const SHIFT_STARTS = {
  2: ['07:00', '22:00'],
  3: ['06:00', '14:00', '22:00'],
};

/**
 * Berapa shift di tanggal itu yang SUDAH mulai pada jam PM. Shift yang sedang
 * berjalan saat PM dianggap sudah lewat (tidak dihitung ke siklus berikutnya).
 * @param {number} jumlahShift 2 atau 3 (default 2)
 * @param {string} nowHHMM     jam PM WIB 'HH:mm'
 */
function shiftsStartedAt(jumlahShift, nowHHMM) {
  const starts = SHIFT_STARTS[jumlahShift] || SHIFT_STARTS[2];
  return starts.filter((s) => s <= nowHHMM).length;
}

/** 'Shift 2 (2 Shift)' -> 2. Null kalau tidak terbaca. */
function parseShiftNumber(label) {
  const m = /shift\s*(\d+)/i.exec(label || '');
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Run yang dihitung untuk satu tanggal.
 * - tanggal setelah baseline  -> semua run
 * - tanggal = baseline        -> hanya shift bernomor > cut (cut tersimpan saat PM disubmit);
 *                                cut kosong (null/undefined) = seluruh tanggal baseline dibuang (perilaku lama)
 * - sebelum baseline          -> 0
 */
function countEligibleRuns({ dateStr, baselineStr, cut, runCount, shifts }) {
  if (dateStr > baselineStr) return runCount;
  if (dateStr < baselineStr) return 0;
  if (cut === null || cut === undefined) return 0;
  return (shifts || []).filter((label) => {
    const n = parseShiftNumber(label);
    return n !== null && n > Number(cut);
  }).length;
}

module.exports = { SHIFT_STARTS, shiftsStartedAt, parseShiftNumber, countEligibleRuns };
