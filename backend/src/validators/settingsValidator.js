// src/validators/settingsValidator.js

/**
 * @param {string} valueType - 'number' | 'boolean' | 'text' (dari row app_settings)
 * @param {*} value - value dari request body
 */
function validateSettingValue(valueType, value) {
  const errors = {};

  if (value === undefined || value === null) {
    errors.value = 'Value wajib diisi';
    return { valid: false, errors };
  }

  if (valueType === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.value = 'Value harus berupa angka';
    }
  } else if (valueType === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.value = 'Value harus berupa boolean (true/false)';
    }
  } else if (valueType === 'text') {
    if (typeof value !== 'string') {
      errors.value = 'Value harus berupa teks';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateSettingValue };
