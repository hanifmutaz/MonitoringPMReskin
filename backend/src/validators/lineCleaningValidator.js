// src/validators/lineCleaningValidator.js
const dateUtils = require('../utils/dateUtils');

function validateCreateLineCleaning(body) {
  const errors = {};

  if (!body || !Number.isInteger(body.line_id)) {
    errors.line_id = 'Line ID wajib diisi (integer)';
  }

  // tgl_cleaning OPSIONAL: kosong = hari ini (WIB). Tidak boleh di masa depan.
  if (body && body.tgl_cleaning !== undefined && body.tgl_cleaning !== null && body.tgl_cleaning !== '') {
    if (typeof body.tgl_cleaning !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.tgl_cleaning)) {
      errors.tgl_cleaning = 'Tanggal Cleaning harus format YYYY-MM-DD';
    } else if (body.tgl_cleaning > dateUtils.todayString()) {
      errors.tgl_cleaning = 'Tanggal Cleaning tidak boleh di masa depan';
    }
  }

  if (!body || typeof body.pic_name !== 'string' || body.pic_name.trim() === '') {
    errors.pic_name = 'PIC wajib diisi';
  } else if (body.pic_name.length > 150) {
    errors.pic_name = 'PIC maksimal 150 karakter';
  }

  // Keterangan WAJIB (apa yang dibersihkan / kondisi Line saat cleaning), supaya riwayat cleaning bisa diaudit.
  if (!body || typeof body.keterangan !== 'string' || body.keterangan.trim() === '') {
    errors.keterangan = 'Keterangan wajib diisi';
  } else if (body.keterangan.trim().length > 500) {
    errors.keterangan = 'Keterangan maksimal 500 karakter';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateLineCleaning };
