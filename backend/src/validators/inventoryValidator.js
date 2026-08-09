// src/validators/inventoryValidator.js

function validateCreateItem(body) {
  const errors = {};
  if (!body || typeof body.spare_part_number !== 'string' || body.spare_part_number.trim() === '') {
    errors.spare_part_number = 'Spare Part Number wajib diisi';
  } else if (body.spare_part_number.length > 100) {
    errors.spare_part_number = 'Spare Part Number maksimal 100 karakter';
  }
  if (!body || typeof body.part_name !== 'string' || body.part_name.trim() === '') {
    errors.part_name = 'Part Name wajib diisi';
  }
  if (body && body.location !== undefined && body.location !== null && String(body.location).length > 150) {
    errors.location = 'Lokasi maksimal 150 karakter';
  }
  if (body && body.initial_stock !== undefined && body.initial_stock !== null && body.initial_stock !== '') {
    const n = Number(body.initial_stock);
    if (!Number.isInteger(n) || n < 0) {
      errors.initial_stock = 'Stok awal harus angka bulat >= 0';
    }
  }
  if (body && body.lead_time_days !== undefined && body.lead_time_days !== null && body.lead_time_days !== '') {
    const n = Number(body.lead_time_days);
    if (!Number.isInteger(n) || n < 0) {
      errors.lead_time_days = 'Lead Time harus angka bulat (hari) >= 0';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function validateUpdateItem(body) {
  const errors = {};
  if (!body) return { valid: false, errors: { _general: 'Body kosong' } };

  if (body.spare_part_number !== undefined) {
    if (typeof body.spare_part_number !== 'string' || body.spare_part_number.trim() === '') {
      errors.spare_part_number = 'Spare Part Number tidak boleh kosong';
    }
  }
  if (body.part_name !== undefined) {
    if (typeof body.part_name !== 'string' || body.part_name.trim() === '') {
      errors.part_name = 'Part Name tidak boleh kosong';
    }
  }
  if (body.lead_time_days !== undefined && body.lead_time_days !== null && body.lead_time_days !== '') {
    const n = Number(body.lead_time_days);
    if (!Number.isInteger(n) || n < 0) {
      errors.lead_time_days = 'Lead Time harus angka bulat (hari) >= 0';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function validateAdjustStock(body) {
  const errors = {};
  if (!body || !['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'].includes(body.movement_type)) {
    errors.movement_type = 'movement_type wajib salah satu dari STOCK_IN / STOCK_OUT / ADJUSTMENT';
  }
  const qty = Number(body?.qty);
  if (!Number.isInteger(qty) || qty <= 0) {
    errors.qty = 'Qty wajib angka bulat > 0';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCreateItem, validateUpdateItem, validateAdjustStock };
