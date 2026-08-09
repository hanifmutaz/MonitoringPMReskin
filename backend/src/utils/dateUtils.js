// src/utils/dateUtils.js
//
// Semua manipulasi tanggal WAJIB lewat sini (Development Rules §30 /
// 06_ENVIRONMENT_AND_BOOTSTRAP.md §7) — dilarang `new Date(str + "T00:00:00")`.

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';
const DATE_FORMAT = 'YYYY-MM-DD';

/** Tanggal hari ini di WIB, start of day (buat perhitungan kalender murni). */
function today() {
  return dayjs().tz(TZ).startOf('day');
}

/** Parse nilai DATE dari PostgreSQL (via pg driver) jadi dayjs UTC start-of-day. */
function parseDbDate(value) {
  if (!value) return null;
  return dayjs.utc(value).startOf('day');
}

/** Selisih hari (bilangan bulat) antara hari ini dan tanggal DB. Null kalau dateValue null. */
function daysSince(dateValue) {
  const d = parseDbDate(dateValue);
  if (!d) return null;
  return today().diff(dayjs(d.format(DATE_FORMAT)), 'day');
}

/** Tambah N hari ke hari ini, dikembalikan sebagai string 'YYYY-MM-DD'. */
function addDaysToToday(days) {
  return today().add(Math.ceil(days), 'day').format(DATE_FORMAT);
}

/** Selisih hari (bilangan bulat, toDate - fromDate) antara dua tanggal DB. Null kalau salah satu null. */
function daysBetween(fromDateValue, toDateValue) {
  const from = parseDbDate(fromDateValue);
  const to = parseDbDate(toDateValue);
  if (!from || !to) return null;
  return dayjs(to.format(DATE_FORMAT)).diff(dayjs(from.format(DATE_FORMAT)), 'day');
}

function formatDate(dateValue) {
  const d = parseDbDate(dateValue);
  return d ? d.format(DATE_FORMAT) : null;
}

function todayString() {
  return today().format(DATE_FORMAT);
}

/** Awal tahun berjalan (WIB) - basis filter "tahun berjalan" untuk fitur Ketepatan PM. */
function startOfYearString() {
  return today().startOf('year').format(DATE_FORMAT);
}

module.exports = {
  today,
  parseDbDate,
  daysSince,
  daysBetween,
  addDaysToToday,
  formatDate,
  todayString,
  startOfYearString,
  TZ,
  DATE_FORMAT,
};
