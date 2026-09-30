// src/validators/pmPartHistoryValidator.js
const dateUtils = require('../utils/dateUtils');

function validateCreateHistory(body) {
  const errors = {};

  if (!body || !Number.isInteger(body.part_id)) {
    errors.part_id = 'Part ID wajib diisi (integer)';
  }

  if (!body || typeof body.tgl_ganti !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.tgl_ganti)) {
    errors.tgl_ganti = 'Tanggal Ganti wajib diisi format YYYY-MM-DD';
  } else if (body.tgl_ganti > dateUtils.todayString()) {
    errors.tgl_ganti = 'Tanggal Ganti tidak boleh di masa depan';
  }

  if (body && body.shift !== undefined && body.shift !== null && ![1, 2, 3].includes(body.shift)) {
    errors.shift = 'Shift harus 1, 2, atau 3';
  }

  if (!body || !Number.isFinite(body.counter_saat_diganti) || body.counter_saat_diganti < 0) {
    errors.counter_saat_diganti = 'Counter Saat Diganti wajib diisi dan harus >= 0';
  }

  // Daftar jenis sekarang master data (tabel jenis_penggantian), jadi validasi
  // "kode-nya ada & aktif" dilakukan di pmPartHistoryService.createHistory.
  if (!body || typeof body.jenis_penggantian !== 'string' || body.jenis_penggantian.trim() === '') {
    errors.jenis_penggantian = 'Jenis Penggantian wajib diisi';
  }

  if (!body || typeof body.pic_name !== 'string' || body.pic_name.trim() === '') {
    errors.pic_name = 'PIC wajib diisi';
  } else if (body.pic_name.length > 150) {
    errors.pic_name = 'PIC maksimal 150 karakter';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateHistory };