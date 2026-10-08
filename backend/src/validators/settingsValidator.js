// src/validators/settingsValidator.js

const BACKUP_FORMATS = ['dump', 'sql', 'xlsx'];

// Aturan tambahan per key (di luar cek tipe). Hanya dijalankan kalau cek tipe
// sudah lolos, jadi `value` di sini pasti bertipe benar. Return pesan error
// atau null.
const KEY_RULES = {
  pm_ontime_cutoff_time: (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : 'Format jam harus HH:MM (00:00 - 23:59); 00:00 = nonaktif'),
  backup_auto_time: (v) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? null : 'Format jam harus HH:MM (00:00 - 23:59)'),
  backup_auto_format: (v) => (BACKUP_FORMATS.includes(v) ? null : `Pilih salah satu: ${BACKUP_FORMATS.join(', ')}`),
  backup_auto_interval_days: (v) =>
    Number.isInteger(v) && v >= 1 && v <= 30 ? null : 'Harus bilangan bulat 1 - 30 hari',
  backup_auto_keep: (v) => (Number.isInteger(v) && v >= 1 && v <= 90 ? null : 'Harus bilangan bulat 1 - 90 file'),
};

/**
 * @param {string} valueType - 'number' | 'boolean' | 'text' (dari row app_settings)
 * @param {*} value - value dari request body
 * @param {string} [key] - key setting; kalau diberikan, aturan khusus key itu (KEY_RULES) ikut dicek
 */
function validateSettingValue(valueType, value, key) {
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

  if (Object.keys(errors).length === 0 && key && KEY_RULES[key]) {
    const message = KEY_RULES[key](value);
    if (message) errors.value = message;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = { validateSettingValue };
