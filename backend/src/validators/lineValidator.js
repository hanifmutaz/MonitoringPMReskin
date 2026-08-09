// src/validators/lineValidator.js

function validateCreateLine(body) {
  const errors = {};

  if (!body || typeof body.line_name !== 'string' || body.line_name.trim() === '') {
    errors.line_name = 'Line Name wajib diisi';
  } else if (body.line_name.length > 50) {
    errors.line_name = 'Line Name maksimal 50 karakter';
  }

  if (
    body &&
    body.auto_reset_weekly_on_monthly !== undefined &&
    body.auto_reset_weekly_on_monthly !== null &&
    typeof body.auto_reset_weekly_on_monthly !== 'boolean'
  ) {
    errors.auto_reset_weekly_on_monthly = 'Harus boolean atau null';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateUpdateLine(body) {
  const errors = {};

  if (body.line_name !== undefined) {
    if (typeof body.line_name !== 'string' || body.line_name.trim() === '') {
      errors.line_name = 'Line Name tidak boleh kosong';
    } else if (body.line_name.length > 50) {
      errors.line_name = 'Line Name maksimal 50 karakter';
    }
  }

  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'Harus boolean';
  }

  if (
    body.auto_reset_weekly_on_monthly !== undefined &&
    body.auto_reset_weekly_on_monthly !== null &&
    typeof body.auto_reset_weekly_on_monthly !== 'boolean'
  ) {
    errors.auto_reset_weekly_on_monthly = 'Harus boolean atau null';
  }

  if (Object.keys(body || {}).length === 0) {
    errors._general = 'Tidak ada field yang diubah';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateLine, validateUpdateLine };
