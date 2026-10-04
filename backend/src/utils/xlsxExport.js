// src/utils/xlsxExport.js
// Util kecil buat export tabel ke file .xlsx (pakai paket `xlsx` yang sudah
// jadi dependency untuk import Master Data - tidak ada dependency baru).
//
// Semua nilai ditulis sebagai sel TEKS/ANGKA murni (bukan formula), jadi isi
// seperti "=1+1" atau "@cmd" dari input user TIDAK dieksekusi Excel.
const xlsx = require('xlsx');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const AppError = require('./AppError');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Jakarta';

// Batas aman supaya satu request tidak menghabiskan memori server.
const EXPORT_MAX_ROWS = 50000;

/** TIMESTAMPTZ -> 'YYYY-MM-DD HH:mm' (WIB). Kosong kalau null/invalid. */
function formatTimestampWib(value) {
  if (!value) return '';
  const d = dayjs(value);
  return d.isValid() ? d.tz(TZ).format('YYYY-MM-DD HH:mm') : '';
}

/** on_time boolean/null -> label yang sama dengan badge di UI. */
function onTimeLabel(onTime) {
  if (onTime === null || onTime === undefined) return '-';
  return onTime ? 'Tepat waktu' : 'Terlambat';
}

/**
 * @param {object} p
 * @param {string} p.sheetName
 * @param {{header:string, width?:number, value:(row:object)=>any}[]} p.columns
 * @param {object[]} p.rows
 * @returns {Buffer} isi file .xlsx
 */
function buildXlsxBuffer({ sheetName, columns, rows }) {
  const aoa = [
    columns.map((c) => c.header),
    ...rows.map((row) =>
      columns.map((c) => {
        const v = c.value(row);
        return v === undefined || v === null ? '' : v;
      })
    ),
  ];
  const ws = xlsx.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map((c) => ({ wch: c.width || 16 }));
  if (rows.length > 0) {
    ws['!autofilter'] = { ref: xlsx.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: columns.length - 1 } }) };
  }
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, String(sheetName).slice(0, 31));
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/** Nama file: <prefix>-YYYYMMDD-HHmm.xlsx (WIB). */
function exportFilename(prefix) {
  return `${prefix}-${dayjs().tz(TZ).format('YYYYMMDD-HHmm')}.xlsx`;
}

/** Kirim buffer xlsx sebagai download. */
function sendXlsx(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(buffer);
}

/** Dipakai query export: ambil LIMIT cap+1 lalu tolak kalau melebihi cap. */
function assertWithinExportLimit(rows) {
  if (rows.length > EXPORT_MAX_ROWS) {
    throw AppError.badRequest(
      `Data terlalu banyak untuk satu export (maks ${EXPORT_MAX_ROWS.toLocaleString('id-ID')} baris). Persempit filter dulu.`
    );
  }
  return rows;
}

module.exports = {
  EXPORT_MAX_ROWS,
  buildXlsxBuffer,
  exportFilename,
  sendXlsx,
  formatTimestampWib,
  onTimeLabel,
  assertWithinExportLimit,
};
