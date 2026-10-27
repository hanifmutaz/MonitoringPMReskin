// src/utils/historyRemark.js
//
// Aturan Remark (PM Part) / Keterangan (PM Line) di history PM:
//   - WAJIB diisi (min. 3 karakter setelah di-trim, maks. 500) saat input PM baru
//   - WAJIB juga saat edit history, jadi baris lama yang remark-nya masih kosong
//     bisa dilengkapi lewat Edit tanpa bisa dikosongkan lagi.

const MIN_LENGTH = 3;
const MAX_LENGTH = 500;

/**
 * @param {unknown} value
 * @param {string} label - nama field untuk pesan error ('Remark' / 'Keterangan')
 * @returns {string|null} pesan error, atau null kalau valid
 */
function validateRemark(value, label) {
  if (typeof value !== 'string' || value.trim().length < MIN_LENGTH) {
    return `${label} wajib diisi (minimal ${MIN_LENGTH} karakter)`;
  }
  if (value.trim().length > MAX_LENGTH) return `${label} maksimal ${MAX_LENGTH} karakter`;
  return null;
}

module.exports = { validateRemark, MIN_LENGTH, MAX_LENGTH };
