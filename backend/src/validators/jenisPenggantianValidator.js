// src/validators/jenisPenggantianValidator.js

function validateLabel(label, errors) {
  if (typeof label !== 'string' || label.trim() === '') {
    errors.label = 'Nama jenis wajib diisi';
  } else if (label.trim().length > 50) {
    errors.label = 'Nama jenis maksimal 50 karakter';
  }
}

function validateCreate(body) {
  const errors = {};
  validateLabel(body?.label, errors);
  if (body?.counts_in_ketepatan !== undefined && typeof body.counts_in_ketepatan !== 'boolean') {
    errors.counts_in_ketepatan = 'Harus boolean';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function validateUpdate(body) {
  const errors = {};
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: { body: 'Body wajib diisi' } };
  }
  if (body.label !== undefined) validateLabel(body.label, errors);
  if (body.counts_in_ketepatan !== undefined && typeof body.counts_in_ketepatan !== 'boolean') {
    errors.counts_in_ketepatan = 'Harus boolean';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'Harus boolean';
  }
  if (
    body.label === undefined &&
    body.counts_in_ketepatan === undefined &&
    body.is_active === undefined
  ) {
    errors.body = 'Minimal satu field harus diisi';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreate, validateUpdate };
