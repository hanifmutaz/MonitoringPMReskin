// src/utils/dateRange.js
//
// Filter tanggal (date_from / date_to) yang dipakai halaman history, audit log
// dan export. Dua tugas:
//  1. parseDateRange(): validasi query string -> 400 yang jelas, BUKAN 500 dari
//     Postgres (sebelumnya "date_from=abc" langsung meledak jadi error SQL).
//  2. addTimestampRange(): kondisi SQL untuk kolom TIMESTAMPTZ (created_at).
//     Batas hari dihitung dalam WIB (Asia/Jakarta), sama dengan jam yang
//     ditampilkan di UI & export, dan date_to bersifat INKLUSIF (seluruh hari
//     itu ikut, tapi 00:00 hari berikutnya tidak).
//     Kolom bertipe DATE (tgl_ganti, tgl_input) cukup dibandingkan langsung,
//     tidak perlu helper ini.
const AppError = require('./AppError');

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Ketat: "2026-02-30" ditolak, bukan digeser jadi 2 Maret. Dicek manual lewat
// Date.UTC (bukan plugin dayjs customParseFormat): dayjs.extend() bersifat
// GLOBAL dan mengubah cara dateUtils.js mem-parse tanggal di seluruh app.
function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * @param {{date_from?: string, date_to?: string}} query - biasanya req.query
 * @returns {{dateFrom: string|undefined, dateTo: string|undefined}}
 * @throws {AppError} 400 kalau format salah atau date_from > date_to
 */
function parseDateRange(query = {}) {
  const raw = { date_from: query.date_from, date_to: query.date_to };
  const errors = {};
  const out = {};

  for (const [field, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === '') continue;
    if (!isValidDateString(value)) {
      errors[field] = 'Format tanggal harus YYYY-MM-DD';
    } else {
      out[field] = value;
    }
  }

  // String YYYY-MM-DD bisa dibandingkan leksikografis.
  if (!errors.date_from && !errors.date_to && out.date_from && out.date_to && out.date_from > out.date_to) {
    errors.date_to = 'Tanggal akhir tidak boleh sebelum tanggal awal';
  }

  if (Object.keys(errors).length > 0) {
    throw AppError.badRequest('Validasi gagal', errors);
  }
  return { dateFrom: out.date_from, dateTo: out.date_to };
}

/**
 * Tambah kondisi rentang tanggal untuk kolom TIMESTAMPTZ. Mengubah `conditions`
 * dan `params` in-place (pola yang sama dengan buildWhere di sql/*Queries.js).
 */
function addTimestampRange(conditions, params, column, dateFrom, dateTo) {
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`${column} >= (($${params.length}::date)::timestamp AT TIME ZONE 'Asia/Jakarta')`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`${column} < ((($${params.length}::date + 1))::timestamp AT TIME ZONE 'Asia/Jakarta')`);
  }
}

module.exports = { parseDateRange, addTimestampRange, isValidDateString };
