// src/validators/pmLineHistoryValidator.js
const dateUtils = require('../utils/dateUtils');
const { validateAlasanTelatShape } = require('../utils/alasanTelat');
const { validateRemark } = require('../utils/historyRemark');

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

  // Keterangan (remark) WAJIB diisi (tidak bisa dikosongkan).
  const keteranganErr = validateRemark(body && body.keterangan, 'Keterangan');
  if (keteranganErr) errors.keterangan = keteranganErr;

  // Wajib-tidaknya ditentukan service (hanya kalau PM terbukti telat); di sini cuma cek bentuk.
  const alasanErr = validateAlasanTelatShape(body && body.alasan_telat);
  if (alasanErr) errors.alasan_telat = alasanErr;

  return { valid: Object.keys(errors).length === 0, errors };
}

// Edit history PM Line: HANYA Keterangan, PIC, dan Alasan Telat. Tanggal, jenis PM dan ketepatan
// sengaja TIDAK bisa diedit (menentukan baseline & KPI; koreksi tanggal tetap lewat edit Admin
// di halaman Monitoring). Keterangan tetap wajib supaya baris lama yang kosong bisa dilengkapi.
function validateUpdatePmLineHistory(body) {
  const errors = {};

  const keteranganErr = validateRemark(body && body.keterangan, 'Keterangan');
  if (keteranganErr) errors.keterangan = keteranganErr;

  if (body && body.pic_name !== undefined) {
    if (typeof body.pic_name !== 'string' || body.pic_name.trim() === '') errors.pic_name = 'PIC wajib diisi';
    else if (body.pic_name.length > 150) errors.pic_name = 'PIC maksimal 150 karakter';
  }

  const alasanErr = validateAlasanTelatShape(body && body.alasan_telat);
  if (alasanErr) errors.alasan_telat = alasanErr;

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

module.exports = { validateCreatePmLineHistory, validateUpdatePmLineHistory, validateUpdateLastPmDate, JENIS_ENUM };