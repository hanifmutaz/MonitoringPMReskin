// src/validators/userValidator.js
const { validatePassword } = require('../utils/passwordPolicy');

function validateCreateUser(body) {
  const errors = {};

  if (!body || typeof body.username !== 'string' || body.username.trim() === '') {
    errors.username = 'Username wajib diisi';
  } else if (body.username.length > 50) {
    errors.username = 'Username maksimal 50 karakter';
  }

  if (!body || typeof body.password !== 'string') {
    errors.password = 'Password wajib diisi';
  } else {
    const { valid, error } = validatePassword(body.password, body.username);
    if (!valid) errors.password = error;
  }

  if (!body || typeof body.full_name !== 'string' || body.full_name.trim() === '') {
    errors.full_name = 'Full Name wajib diisi';
  } else if (body.full_name.length > 100) {
    errors.full_name = 'Full Name maksimal 100 karakter';
  }

  if (!body || !Number.isInteger(body.role_id)) {
    errors.role_id = 'Role ID wajib diisi (integer)';
  }

  if (body && body.email !== undefined && body.email !== null && body.email !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.email = 'Format email tidak valid';
    } else if (body.email.length > 150) {
      errors.email = 'Email maksimal 150 karakter';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateUpdateUser(body) {
  const errors = {};

  if (body.username !== undefined) {
    if (typeof body.username !== 'string' || body.username.trim() === '') {
      errors.username = 'Username tidak boleh kosong';
    } else if (body.username.length > 50) {
      errors.username = 'Username maksimal 50 karakter';
    }
  }
  if (body.password !== undefined) {
    if (typeof body.password !== 'string') {
      errors.password = 'Password harus berupa teks';
    } else {
      const { valid, error } = validatePassword(body.password, body.username);
      if (!valid) errors.password = error;
    }
  }
  if (body.full_name !== undefined) {
    if (typeof body.full_name !== 'string' || body.full_name.trim() === '') {
      errors.full_name = 'Full Name tidak boleh kosong';
    } else if (body.full_name.length > 100) {
      errors.full_name = 'Full Name maksimal 100 karakter';
    }
  }
  if (body.role_id !== undefined && !Number.isInteger(body.role_id)) {
    errors.role_id = 'Role ID harus integer';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'Harus boolean';
  }
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.email = 'Format email tidak valid';
    } else if (body.email.length > 150) {
      errors.email = 'Email maksimal 150 karakter';
    }
  }
  if (Object.keys(body || {}).length === 0) {
    errors._general = 'Tidak ada field yang diubah';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateUser, validateUpdateUser };