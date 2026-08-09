// src/validators/masterDataImportValidator.js

function validateCommitPayload(body) {
  const errors = {};

  if (!body || !Array.isArray(body.rows) || body.rows.length === 0) {
    errors.rows = 'rows wajib berupa array dan tidak boleh kosong';
    return { valid: false, errors };
  }

  body.rows.forEach((row, idx) => {
    if (row.include === false) return; // baris yang di-uncheck Admin, tidak divalidasi

    if (!row.line_no || !row.jig_name || !row.drawing_no || !row.part_name || !row.cl_no) {
      errors[`row_${idx}`] = 'Field wajib (line_no, jig_name, drawing_no, part_name, cl_no) tidak lengkap';
    }
    if (row.target_shot === undefined || row.target_shot === null || Number(row.target_shot) <= 0) {
      errors[`row_${idx}_target_shot`] = 'Target Shot harus angka > 0';
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateCommitPayload };
