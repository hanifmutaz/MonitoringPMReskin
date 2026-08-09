// src/validators/authValidator.js
// Validasi dasar (format) di Controller layer — bukan business logic.

function validateLoginBody(body) {
  const errors = {};

  if (!body || typeof body.username !== 'string' || body.username.trim() === '') {
    errors.username = 'Username wajib diisi';
  }
  if (!body || typeof body.password !== 'string' || body.password === '') {
    errors.password = 'Password wajib diisi';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateRegisterBody(body) {
  const errors = {};

  if (!body || typeof body.username !== 'string' || body.username.trim() === '') {
    errors.username = 'Username wajib diisi';
  } else if (body.username.length > 50) {
    errors.username = 'Username maksimal 50 karakter';
  }

  if (!body || typeof body.password !== 'string' || body.password === '') {
    errors.password = 'Password wajib diisi';
  }

  if (!body || typeof body.full_name !== 'string' || body.full_name.trim() === '') {
    errors.full_name = 'Full Name wajib diisi';
  } else if (body.full_name.length > 100) {
    errors.full_name = 'Full Name maksimal 100 karakter';
  }

  if (body && body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.email = 'Format email tidak valid';
    } else if (body.email.length > 150) {
      errors.email = 'Email maksimal 150 karakter';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateLoginBody, validateRegisterBody };
