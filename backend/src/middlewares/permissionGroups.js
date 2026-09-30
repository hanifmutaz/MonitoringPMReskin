// src/middlewares/permissionGroups.js
//
// Kelompok permission yang dipakai bareng di beberapa route, supaya daftar
// "siapa boleh baca data referensi" ada di SATU tempat (bukan di-copy ke tiap
// route file lalu drift).

// Data referensi (Lines, Parts, Suppliers, CL Mapping): dibaca halaman Master
// Data, tapi juga jadi sumber dropdown di form input PM & Inventory. Jadi
// boleh dibaca role yang punya salah satu permission modul yang memakainya.
// Role yang TIDAK punya satupun (mis. Management yang cuma boleh Dashboard)
// otomatis ditolak.
const REFERENCE_DATA_READ = [
  'masterdata.view',
  'masterdata.edit',
  'pm_part.view',
  'pm_part.submit',
  'pm_line.view',
  'pm_line.submit',
  'inventory.view',
  'inventory.input',
  'inventory.manage',
];

module.exports = { REFERENCE_DATA_READ };
