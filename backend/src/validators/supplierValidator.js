// src/validators/supplierValidator.js
function validateCreateSupplier(body) {
  const errors = {};

  if (!body || typeof body.supplier_name !== 'string' || body.supplier_name.trim() === '') {
    errors.supplier_name = 'Nama Supplier wajib diisi';
  } else if (body.supplier_name.length > 150) {
    errors.supplier_name = 'Nama Supplier maksimal 150 karakter';
  }

  if (body && body.contact_person !== undefined && body.contact_person !== null && body.contact_person.length > 150) {
    errors.contact_person = 'Nama Kontak maksimal 150 karakter';
  }
  if (body && body.phone !== undefined && body.phone !== null && body.phone.length > 50) {
    errors.phone = 'Telepon maksimal 50 karakter';
  }
  if (body && body.email !== undefined && body.email !== null && body.email.length > 150) {
    errors.email = 'Email maksimal 150 karakter';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateUpdateSupplier(body) {
  const errors = {};

  if (body.supplier_name !== undefined) {
    if (typeof body.supplier_name !== 'string' || body.supplier_name.trim() === '') {
      errors.supplier_name = 'Nama Supplier tidak boleh kosong';
    } else if (body.supplier_name.length > 150) {
      errors.supplier_name = 'Nama Supplier maksimal 150 karakter';
    }
  }
  if (body.contact_person !== undefined && body.contact_person !== null && body.contact_person.length > 150) {
    errors.contact_person = 'Nama Kontak maksimal 150 karakter';
  }
  if (body.phone !== undefined && body.phone !== null && body.phone.length > 50) {
    errors.phone = 'Telepon maksimal 50 karakter';
  }
  if (body.email !== undefined && body.email !== null && body.email.length > 150) {
    errors.email = 'Email maksimal 150 karakter';
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.is_active = 'Harus boolean';
  }
  if (Object.keys(body || {}).length === 0) {
    errors._general = 'Tidak ada field yang diubah';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateSupplier, validateUpdateSupplier };
