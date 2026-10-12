// src/utils/pmAccrual.js
//
// Akumulasi poin PM Monthly/Weekly dari baseline (Tgl PM terakhir) sampai HARI INI
// (inklusif, realtime). Satu sumber kebenaran buat pmMonthlyAccrualService &
// pmWeeklyAccrualService - sebelumnya loop-nya diduplikasi di dua file.
//
// Murni (tanpa DB / waktu sistem / timezone) supaya mudah di-unit-test.
//
// KENAPA string tanggal, bukan objek dayjs: versi lama membandingkan
// `cursor` (dayjs mode UTC, 00:00 UTC) dengan `today` (dayjs WIB, 00:00 WIB =
// 17:00 UTC hari sebelumnya) lewat isAfter() - itu membandingkan INSTAN waktu,
// jadi tanggal hari ini selalu dianggap "setelah today" dan tidak pernah ikut
// dihitung (data shift hari ini baru masuk poin besok). Membandingkan string
// 'YYYY-MM-DD' membuat bug kelas ini tidak mungkin terjadi.

const { computeDailyPoints } = require('./pmPointFormula');
const { countEligibleRuns } = require('./pmShiftSchedule');

/** 'YYYY-MM-DD' -> 'YYYY-MM-DD' hari berikutnya (aritmetika UTC murni, bebas timezone/DST). */
function nextDateStr(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {object} p
 * @param {string} p.baselineStr  Tgl PM terakhir 'YYYY-MM-DD'
 * @param {string} p.todayStr     hari ini (WIB) 'YYYY-MM-DD' - IKUT dihitung
 * @param {number|null|undefined} p.shiftCut  jumlah shift di tanggal PM yang sudah mulai saat PM
 *                                disubmit (null/undefined = seluruh tanggal PM dibuang)
 * @param {Map<string,{count:number,shifts:string[]}>} p.runCountsByDate  tanggal -> run ConMas
 * @param {number} p.jumlahShift  jumlah shift normal Line
 * @param {number} p.pointFullRun poin untuk 1 hari running penuh
 * @returns {{total:number, totalPrev:number}}
 *   total     = poin mentah (tanpa cap) sampai HARI INI.
 *   totalPrev = poin mentah sampai KEMARIN (tanpa hari ini) - dipakai toleransi
 *               jam batas PM (migration 1700000033000): cap baru terlewati oleh
 *               poin hari berjalan, bukan sebelumnya.
 */
function computeAccruedPoints({ baselineStr, todayStr, shiftCut, runCountsByDate, jumlahShift, pointFullRun }) {
  const hasShiftCut = shiftCut !== null && shiftCut !== undefined;
  // PM sadar-shift: kalau jam PM tersimpan, tanggal PM ikut dihitung untuk shift yang mulai SETELAH PM.
  let cursorStr = hasShiftCut ? baselineStr : nextDateStr(baselineStr);

  let total = 0;
  let totalPrev = 0;
  while (cursorStr <= todayStr) {
    const dayEntry = runCountsByDate.get(cursorStr);
    const runCount = countEligibleRuns({
      dateStr: cursorStr,
      baselineStr,
      cut: shiftCut,
      runCount: dayEntry ? dayEntry.count : 0,
      shifts: dayEntry ? dayEntry.shifts : [],
    });
    const points = computeDailyPoints(runCount, jumlahShift, pointFullRun);
    total += points;
    if (cursorStr < todayStr) totalPrev += points;
    cursorStr = nextDateStr(cursorStr);
  }
  return { total, totalPrev };
}

module.exports = { computeAccruedPoints, nextDateStr };
