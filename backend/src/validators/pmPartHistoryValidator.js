// src/validators/pmPartHistoryValidator.js
const dateUtils = require('../utils/dateUtils');
const { validateAlasanTelatShape } = require('../utils/alasanTelat');
const { validateRemark } = require('../utils/historyRemark');

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

  // Remark WAJIB diisi (tidak bisa dikosongkan).
  const remarkErr = validateRemark(body && body.remark, 'Remark');
  if (remarkErr) errors.remark = remarkErr;

  // Wajib-tidaknya ditentukan service (hanya kalau PM terbukti telat); di sini cuma cek bentuk.
  const alasanErr = validateAlasanTelatShape(body && body.alasan_telat);
  if (alasanErr) errors.alasan_telat = alasanErr;

  return { valid: Object.keys(errors).length === 0, errors };
}

// Edit history PM Part: HANYA Remark, PIC, dan Alasan Telat. Tanggal ganti, counter, jenis
// dan ketepatan sengaja TIDAK bisa diedit karena menentukan counter wear & KPI ketepatan.
// Remark tetap wajib (jadi baris lama yang remark-nya kosong bisa dilengkapi).
function validateUpdateHistory(body) {
  const errors = {};

  const remarkErr = validateRemark(body && body.remark, 'Remark');
  if (remarkErr) errors.remark = remarkErr;

  if (body && body.pic_name !== undefined) {
    if (typeof body.pic_name !== 'string' || body.pic_name.trim() === '') errors.pic_name = 'PIC wajib diisi';
    else if (body.pic_name.length > 150) errors.pic_name = 'PIC maksimal 150 karakter';
  }

  const alasanErr = validateAlasanTelatShape(body && body.alasan_telat);
  if (alasanErr) errors.alasan_telat = alasanErr;

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateHistory, validateUpdateHistory };