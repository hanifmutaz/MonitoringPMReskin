// src/validators/partValidator.js

const dateUtils = require('../utils/dateUtils');

// tgl_pasang_awal WAJIB saat CREATE part baru (tanpa ini Counter/Sisa Shot
// part orisinal nyangkut 0 - lihat pmPartQueries.js), tapi tetap OPSIONAL
// saat UPDATE (part lama yang belum terisi tidak boleh terblokir edit biasa).
// Kalau diisi, format & isinya harus valid - dipakai bareng di create & update.
function validateTglPasangAwal(value, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) errors.tgl_pasang_awal = 'Tanggal Pasang Awal wajib diisi untuk Part baru (atau isi Counter Awal + Tanggal Counter Awal)';
    return;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.tgl_pasang_awal = 'Tanggal Pasang Awal harus format YYYY-MM-DD';
  } else if (value > dateUtils.todayString()) {
    errors.tgl_pasang_awal = 'Tanggal Pasang Awal tidak boleh di masa depan';
  }
}

// counter_awal + counter_awal_tanggal SELALU berpasangan (migration
// 1700000026000): dua-duanya diisi, atau dua-duanya kosong. counter_awal
// boleh 0 (Part baru/belum terpakai per tanggal cutoff), tanggal tidak boleh
// di masa depan. Dipakai bareng di create & update.
function validateCounterAwal(body, errors) {
  const hasAngka = body && body.counter_awal !== undefined && body.counter_awal !== null && body.counter_awal !== '';
  const hasTanggal =
    body && body.counter_awal_tanggal !== undefined && body.counter_awal_tanggal !== null && body.counter_awal_tanggal !== '';
  if (!hasAngka && !hasTanggal) return;

  if (hasAngka && (!Number.isInteger(body.counter_awal) || body.counter_awal < 0)) {
    errors.counter_awal = 'Counter Awal harus bilangan bulat >= 0';
  }
  if (hasTanggal) {
    if (typeof body.counter_awal_tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.counter_awal_tanggal)) {
      errors.counter_awal_tanggal = 'Tanggal Counter Awal harus format YYYY-MM-DD';
    } else if (body.counter_awal_tanggal > dateUtils.todayString()) {
      errors.counter_awal_tanggal = 'Tanggal Counter Awal tidak boleh di masa depan';
    }
  }
  if (hasAngka && !hasTanggal) errors.counter_awal_tanggal = 'Tanggal Counter Awal wajib diisi kalau Counter Awal diisi';
  if (hasTanggal && !hasAngka) errors.counter_awal = 'Counter Awal wajib diisi kalau Tanggal Counter Awal diisi';
}

function validateCreatePart(body) {
  const errors = {};

  if (!body || !Number.isInteger(body.line_id)) {
    errors.line_id = 'Line ID wajib diisi (integer)';
  }
  if (!body || typeof body.jig_name !== 'string' || body.jig_name.trim() === '') {
    errors.jig_name = 'Jig Name wajib diisi';
  } else if (body.jig_name.length > 150) {
    errors.jig_name = 'Jig Name maksimal 150 karakter';
  }
  if (!body || typeof body.drawing_no !== 'string' || body.drawing_no.trim() === '') {
    errors.drawing_no = 'Drawing No wajib diisi';
  } else if (body.drawing_no.length > 100) {
    errors.drawing_no = 'Drawing No maksimal 100 karakter';
  }
  if (!body || typeof body.part_name !== 'string' || body.part_name.trim() === '') {
    errors.part_name = 'Part Name wajib diisi';
  } else if (body.part_name.length > 150) {
    errors.part_name = 'Part Name maksimal 150 karakter';
  }
  if (!body || !Number.isFinite(body.target_shot) || body.target_shot <= 0) {
    errors.target_shot = 'Target Shot wajib diisi dan harus > 0';
  }
  if (body && body.spare_part_qty !== undefined && body.spare_part_qty !== null) {
    if (!Number.isInteger(body.spare_part_qty) || body.spare_part_qty < 0) {
      errors.spare_part_qty = 'Spare Part Qty harus bilangan bulat >= 0';
    }
  }
  // Part baru butuh SALAH SATU titik awal hitung: Tanggal Pasang Awal ATAU
  // pasangan Counter Awal + Tanggalnya (buat Part lama yang tanggal pasangnya
  // tidak diketahui).
  const punyaCounterAwal =
    body && body.counter_awal !== undefined && body.counter_awal !== null && body.counter_awal !== '';
  validateTglPasangAwal(body && body.tgl_pasang_awal, errors, { required: !punyaCounterAwal });
  validateCounterAwal(body, errors);

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateUpdatePart(body) {
  const errors = {};

  if (body.line_id !== undefined && !Number.isInteger(body.line_id)) {
    errors.line_id = 'Line ID harus integer';
  }
  if (body.jig_name !== undefined) {
    if (typeof body.jig_name !== 'string' || body.jig_name.trim() === '') {
      errors.jig_name = 'Jig Name tidak boleh kosong';
    } else if (body.jig_name.length > 150) {
      errors.jig_name = 'Jig Name maksimal 150 karakter';
    }
  }
  if (body.drawing_no !== undefined) {
    if (typeof body.drawing_no !== 'string' || body.drawing_no.trim() === '') {
      errors.drawing_no = 'Drawing No tidak boleh kosong';
    } else if (body.drawing_no.length > 100) {
      errors.drawing_no = 'Drawing No maksimal 100 karakter';
    }
  }
  if (body.part_name !== undefined) {
    if (typeof body.part_name !== 'string' || body.part_name.trim() === '') {
      errors.part_name = 'Part Name tidak boleh kosong';
    } else if (body.part_name.length > 150) {
      errors.part_name = 'Part Name maksimal 150 karakter';
    }
  }
  if (body.target_shot !== undefined) {
    if (!Number.isFinite(body.target_shot) || body.target_shot <= 0) {
      errors.target_shot = 'Target Shot harus > 0';
    }
  }
  if (body.spare_part_qty !== undefined && body.spare_part_qty !== null) {
    if (!Number.isInteger(body.spare_part_qty) || body.spare_part_qty < 0) {
      errors.spare_part_qty = 'Spare Part Qty harus bilangan bulat >= 0';
    }
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'Harus boolean';
  }
  validateTglPasangAwal(body && body.tgl_pasang_awal, errors);
  validateCounterAwal(body, errors);
  if (Object.keys(body || {}).length === 0) {
    errors._general = 'Tidak ada field yang diubah';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreatePart, validateUpdatePart };
