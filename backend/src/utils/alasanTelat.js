// src/utils/alasanTelat.js
//
// Aturan alasan keterlambatan PM (dipakai PM Line dan PM Part):
// wajib (min. 5 karakter) kalau PM dinilai telat (on_time = false); kalau
// tepat waktu atau dikecualikan dari ketepatan (null), alasan yang terkirim
// diabaikan dan disimpan null.

const AppError = require('./AppError');

const MIN_LENGTH = 5;
const MAX_LENGTH = 500;

/**
 * @param {boolean|null} onTime
 * @param {string|undefined|null} alasan
 * @returns {string|null}
 */
function resolveAlasanTelat(onTime, alasan) {
  if (onTime !== false) return null;
  const trimmed = typeof alasan === 'string' ? alasan.trim() : '';
  if (trimmed.length < MIN_LENGTH) {
    throw AppError.badRequest('Validasi gagal', {
      alasan_telat: `PM ini terlambat, alasan keterlambatan wajib diisi (minimal ${MIN_LENGTH} karakter)`,
    });
  }
  return trimmed;
}

/** Validasi bentuk (opsional) di validator: kalau diisi harus string <= MAX_LENGTH. */
function validateAlasanTelatShape(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'Alasan keterlambatan harus berupa teks';
  if (value.length > MAX_LENGTH) return `Alasan keterlambatan maksimal ${MAX_LENGTH} karakter`;
  return null;
}

module.exports = { resolveAlasanTelat, validateAlasanTelatShape, MIN_LENGTH, MAX_LENGTH };
