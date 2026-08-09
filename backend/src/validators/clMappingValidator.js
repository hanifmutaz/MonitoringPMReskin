// src/validators/clMappingValidator.js

function validateCreateClMapping(body) {
  const errors = {};

  if (!body || typeof body.cl_no !== 'string' || body.cl_no.trim() === '') {
    errors.cl_no = 'CL No wajib diisi';
  } else if (body.cl_no.length > 50) {
    errors.cl_no = 'CL No maksimal 50 karakter';
  }
  if (body && body.product_name !== undefined && body.product_name !== null && body.product_name.length > 150) {
    errors.product_name = 'Product Name maksimal 150 karakter';
  }
  if (body && body.jig_name !== undefined && body.jig_name !== null && body.jig_name.length > 150) {
    errors.jig_name = 'Jig Name maksimal 150 karakter';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateClMapping };
