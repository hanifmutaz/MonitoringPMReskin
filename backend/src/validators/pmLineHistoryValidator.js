// src/validators/pmLineHistoryValidator.js
const dateUtils = require('../utils/dateUtils');

const JENIS_ENUM = ['MONTHLY', 'WEEKLY'];

function validateCreatePmLineHistory(body) {
  const errors = {};

  if (!body || !Number.isInteger(body.line_id)) {
    errors.line_id = 'Line ID wajib diisi (integer)';
  }
  // tgl_input OPSIONAL: tanggal ditentukan sistem (lihat resolveTglInput di
  // pmLineHistoryService). Hanya dipakai untuk PM pertama sebuah Line.
  if (body && body.tgl_input !== undefined && body.tgl_input !== null && body.tgl_input !== '') {
    if (typeof body.tgl_input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.tgl_input)) {
      errors.tgl_input = 'Tanggal Input harus format YYYY-MM-DD';
    } else if (body.tgl_input > dateUtils.todayString()) {
      errors.tgl_input = 'Tanggal Input tidak boleh di masa depan';
    }
  }
  if (!body || !JENIS_ENUM.includes(body.jenis_pm)) {
    errors.jenis_pm = `Jenis PM harus salah satu dari: ${JENIS_ENUM.join(', ')}`;
  }

  if (!body || typeof body.pic_name !== 'string' || body.pic_name.trim() === '') {
    errors.pic_name = 'PIC wajib diisi';
  } else if (body.pic_name.length > 150) {
    errors.pic_name = 'PIC maksimal 150 karakter';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// Admin edit langsung "Tgl PM Terakhir" di halaman Monitoring (koreksi data).
// Alasan WAJIB karena perubahan ini nggak lewat riwayat PM, jadi cuma audit
// log yang jadi jejaknya.
function validateUpdateLastPmDate(body) {
  const errors = {};

  if (!body || !JENIS_ENUM.includes(body.jenis_pm)) {
    errors.jenis_pm = `Jenis PM harus salah satu dari: ${JENIS_ENUM.join(', ')}`;
  }
  if (!body || typeof body.tgl !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.tgl)) {
    errors.tgl = 'Tanggal wajib diisi format YYYY-MM-DD';
  } else if (body.tgl > dateUtils.todayString()) {
    errors.tgl = 'Tanggal tidak boleh di masa depan';
  }
  if (!body || typeof body.alasan !== 'string' || body.alasan.trim().length < 5) {
    errors.alasan = 'Alasan wajib diisi (minimal 5 karakter)';
  } else if (body.alasan.length > 500) {
    errors.alasan = 'Alasan maksimal 500 karakter';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreatePmLineHistory, validateUpdateLastPmDate, JENIS_ENUM };