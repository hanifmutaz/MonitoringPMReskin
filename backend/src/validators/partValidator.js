// src/validators/partValidator.js

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
  if (Object.keys(body || {}).length === 0) {
    errors._general = 'Tidak ada field yang diubah';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreatePart, validateUpdatePart };
