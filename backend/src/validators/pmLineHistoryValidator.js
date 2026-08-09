// src/validators/pmLineHistoryValidator.js
const dateUtils = require('../utils/dateUtils');

const JENIS_ENUM = ['MONTHLY', 'WEEKLY'];

function validateCreatePmLineHistory(body) {
  const errors = {};

  if (!body || !Number.isInteger(body.line_id)) {
    errors.line_id = 'Line ID wajib diisi (integer)';
  }
  if (!body || typeof body.tgl_input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.tgl_input)) {
    errors.tgl_input = 'Tanggal Input wajib diisi format YYYY-MM-DD';
  } else if (body.tgl_input > dateUtils.todayString()) {
    errors.tgl_input = 'Tanggal Input tidak boleh di masa depan';
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

module.exports = { validateCreatePmLineHistory, JENIS_ENUM };