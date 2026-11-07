// src/utils/ketepatanPeriod.js
//
// Periode Ketepatan PM yang bisa di-backdate (Dashboard Management). Semua fungsi MURNI
// (tanpa DB / jam sistem / timezone): key bulan 'YYYY-MM' dioperasikan sebagai string,
// jadi tidak ada risiko geser bulan karena timezone. "Bulan sekarang" selalu di-inject
// pemanggil (dari dateUtils.monthKey(0), WIB).

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MIN_YEAR = 2000;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** true kalau 'YYYY-MM' valid (bulan 01-12, tahun >= 2000). */
function isValidMonthKey(value) {
  if (typeof value !== 'string') return false;
  const m = MONTH_RE.exec(value);
  return Boolean(m) && Number(m[1]) >= MIN_YEAR;
}

/** Tambah/kurang bulan: addMonths('2026-01', -1) -> '2025-12'. */
function addMonths(monthKey, offset) {
  const [y, m] = monthKey.split('-').map(Number);
  const index = y * 12 + (m - 1) + offset;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
}

/** 'YYYY-MM' -> 'YYYY-MM-01'. */
function monthStart(monthKey) {
  return `${monthKey}-01`;
}

/** 'YYYY-MM' -> hari terakhir bulan itu ('2026-02' -> '2026-02-28'). */
function monthEnd(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); // hari ke-0 bulan berikutnya = hari terakhir bulan ini
  return `${monthKey}-${pad2(lastDay)}`;
}

/** Tahun (number) dari key bulan. */
function yearOf(monthKey) {
  return Number(monthKey.slice(0, 4));
}

/** 12 key bulan (Jan-Des) untuk tahun itu. */
function monthsOfYear(year) {
  return Array.from({ length: 12 }, (_, i) => `${year}-${pad2(i + 1)}`);
}

/** N key bulan berurutan (lama -> baru) yang BERAKHIR di monthKey. */
function trendMonths(monthKey, count = 6) {
  return Array.from({ length: count }, (_, i) => addMonths(monthKey, -(count - 1 - i)));
}

/**
 * Rentang tanggal (inklusif) untuk periode, "per kondisi bulan terpilih" (backdate):
 *  - 'month' = bulan monthKey saja;
 *  - 'year'  = 1 Januari tahun itu SAMPAI AKHIR monthKey (year-to-date, bukan seluruh tahun kalender),
 *    jadi melihat Maret 2026 menampilkan Jan-Mar 2026 persis seperti saat itu, tidak ikut event April dst.
 * @returns {{from:string, to:string}}
 */
function rangeOf(period, monthKey) {
  if (period === 'year') {
    return { from: `${yearOf(monthKey)}-01-01`, to: monthEnd(monthKey) };
  }
  return { from: monthStart(monthKey), to: monthEnd(monthKey) };
}

/**
 * Validasi parameter ?month. Kosong -> bulan sekarang. Format salah atau bulan di MASA DEPAN
 * (belum ada event yang bisa dinilai) -> error. Murni.
 * @returns {{ok:true, month:string} | {ok:false, message:string}}
 */
function resolveMonthParam(input, currentMonthKey) {
  if (input === undefined || input === null || input === '') return { ok: true, month: currentMonthKey };
  if (!isValidMonthKey(input)) return { ok: false, message: "month harus berformat 'YYYY-MM' (contoh 2026-10)" };
  if (input > currentMonthKey) return { ok: false, message: 'month tidak boleh di masa depan' };
  return { ok: true, month: input };
}

/**
 * Tanda "periode seluruhnya sebelum ketepatan_start_date" (event sebelum tanggal itu tidak dihitung),
 * supaya UI bisa menampilkan "di luar periode hitung", bukan 0% / 100%. startDate kosong/tidak valid = false.
 */
function isBeforeStartDate(rangeTo, startDate) {
  if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return false;
  return rangeTo < startDate;
}

module.exports = {
  isValidMonthKey,
  addMonths,
  monthStart,
  monthEnd,
  yearOf,
  monthsOfYear,
  trendMonths,
  rangeOf,
  resolveMonthParam,
  isBeforeStartDate,
};
