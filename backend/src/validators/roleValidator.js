// src/validators/roleValidator.js

function validateCreateRole(body) {
  const errors = {};
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    errors.name = 'Nama role wajib diisi';
  } else if (body.name.length > 50) {
    errors.name = 'Nama role maksimal 50 karakter';
  }
  if (body && body.permissions !== undefined && !Array.isArray(body.permissions)) {
    errors.permissions = 'permissions harus berupa array';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function validateUpdateRole(body) {
  const errors = {};
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      errors.name = 'Nama role tidak boleh kosong';
    } else if (body.name.length > 50) {
      errors.name = 'Nama role maksimal 50 karakter';
    }
  }
  if (body.permissions !== undefined && !Array.isArray(body.permissions)) {
    errors.permissions = 'permissions harus berupa array';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateRole, validateUpdateRole };
