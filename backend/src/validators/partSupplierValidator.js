// src/validators/partSupplierValidator.js
function validateCreatePartSupplier(body) {
  const errors = {};

  if (!body || body.supplier_id === undefined || body.supplier_id === null || body.supplier_id === '') {
    errors.supplier_id = 'Supplier wajib dipilih';
  } else if (!Number.isInteger(Number(body.supplier_id))) {
    errors.supplier_id = 'Supplier tidak valid';
  }

  if (body && body.notes !== undefined && body.notes !== null && body.notes.length > 2000) {
    errors.notes = 'Catatan maksimal 2000 karakter';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateSetPrimary(body) {
  const errors = {};
  if (!body || typeof body.is_primary !== 'boolean') {
    errors.is_primary = 'is_primary wajib diisi (boolean)';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreatePartSupplier, validateSetPrimary };
