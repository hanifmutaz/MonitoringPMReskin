// src/utils/roles.js
// Nama role akun monitor/TV (view-only). Dipisah dari jwt.js supaya bisa
// di-import middleware tanpa ikut memuat config/env.
const DISPLAY_ROLE = 'Display';

module.exports = { DISPLAY_ROLE };
