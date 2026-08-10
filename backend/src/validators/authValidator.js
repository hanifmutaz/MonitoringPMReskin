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

/**
 * Validasi body PATCH /auth/me (self-service, SIAPA PUN yang login - bukan
 * cuma Admin, beda dari validateUpdateUser di userValidator.js). Field
 * diizinkan cuma full_name & email - dicek eksplisit di sini (bukan cuma
 * "field yang dikenal divalidasi, field asing dibiarkan lewat") karena
 * endpoint ini kebuka buat semua role, jadi body berisi field kayak
 * `role_id`/`is_active` HARUS ketauan & ditolak eksplisit, bukan cuma diam-
 * diam diabaikan controller (biar user dapet pesan error yang jelas kenapa
 * requestnya ditolak, bukan silent no-op yang bingungin).
 */
function validateUpdateProfileBody(body) {
  const errors = {};

  if (body && body.full_name !== undefined) {
    if (typeof body.full_name !== 'string' || body.full_name.trim() === '') {
      errors.full_name = 'Full Name tidak boleh kosong';
    } else if (body.full_name.length > 100) {
      errors.full_name = 'Full Name maksimal 100 karakter';
    }
  }

  if (body && body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.email = 'Format email tidak valid';
    } else if (body.email.length > 150) {
      errors.email = 'Email maksimal 150 karakter';
    }
  }

  if (!body || Object.keys(body).length === 0) {
    errors._general = 'Tidak ada field yang diubah';
  } else {
    const allowed = new Set(['full_name', 'email']);
    const unknown = Object.keys(body).filter((k) => !allowed.has(k));
    if (unknown.length > 0) {
      errors._general = `Field tidak diizinkan lewat endpoint ini: ${unknown.join(', ')}`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validasi body PATCH /auth/me/password. Kebenaran current_password
 * (cocok/tidak sama hash di DB) dicek di service layer (butuh bcrypt.compare
 * + akses DB) - di sini cuma validasi bentuk/presence.
 */
function validateChangePasswordBody(body) {
  const errors = {};

  if (!body || typeof body.current_password !== 'string' || body.current_password === '') {
    errors.current_password = 'Password saat ini wajib diisi';
  }
  if (!body || typeof body.new_password !== 'string' || body.new_password === '') {
    errors.new_password = 'Password baru wajib diisi';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateLoginBody, validateRegisterBody, validateUpdateProfileBody, validateChangePasswordBody };
