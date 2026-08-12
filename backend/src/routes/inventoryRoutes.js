// src/routes/inventoryRoutes.js
const express = require('express');
const inventoryController = require('../controllers/inventoryController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');
const { requireLicensePackage } = require('../middlewares/licenseMiddleware');

const router = express.Router();
router.use(requireAuth);
// Inventory itu fitur Paket B (lihat diagram "Satu Sistem, Dua Paket") -
// dicek SETELAH auth (butuh tau siapa yang minta buat logging error yang
// jelas) tapi SEBELUM permission granular (paket adalah boundary produk,
// lebih besar dari role - kalau instance-nya Paket A, gak ada role/user
// manapun termasuk Admin yang boleh lewat).
router.use(requireLicensePackage('B'));

// GET - view-only, dibuka untuk semua role yang login
router.get('/', inventoryController.list);
router.get('/rop-status', inventoryController.ropStatus);
// HARUS di atas '/:id' - kalau ditaruh di bawah, '/movements/all' bakal
// ketangkep sebagai '/:id' dengan id='movements' duluan.
router.get('/movements/all', inventoryController.allMovements);
router.get('/:id', inventoryController.detail);
router.get('/:id/movements', inventoryController.movements);

// SEMUA aksi tulis Inventory (create/update item, catat stok, hapus item)
// disatukan di bawah 1 permission 'inventory.manage' - supaya role custom
// (mis. "Purchasing") bisa di-assign akses penuh ke Inventory tanpa perlu
// jadi "Operator". Operator sudah di-seed permission ini sejak migration
// 1700000011000.
//
// CATATAN PERUBAHAN PERILAKU dari sebelumnya: create/update Item dulu pakai
// requireMasterDataEditAccess (Operator hanya boleh kalau setting
// allow_operator_edit_master_data=true) dan delete dulu Admin-only. Sekarang
// SEMUA disatukan ke permission inventory.manage supaya konsisten 1 aturan
// untuk semua aksi Inventory - Operator otomatis dapat akses penuh
// Inventory (create/update/delete/adjust-stock) terlepas dari setting
// allow_operator_edit_master_data itu (yang tetap berlaku khusus untuk
// Lines/Parts/CL Mapping saja).
router.post('/', requirePermission('inventory.manage'), inventoryController.create);
router.patch('/:id', requirePermission('inventory.manage'), inventoryController.update);
router.post('/:id/adjust-stock', requirePermission('inventory.manage'), inventoryController.adjustStock);
router.delete('/:id', requirePermission('inventory.manage'), inventoryController.remove);

module.exports = router;