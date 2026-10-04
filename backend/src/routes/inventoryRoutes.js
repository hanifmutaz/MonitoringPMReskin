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

// GET - butuh salah satu dari 'inventory.view' / 'inventory.input' /
// 'inventory.manage' (Admin selalu lolos). Role tanpa satupun (mis.
// Management yang cuma boleh Dashboard) ditolak.
const canReadInventory = requirePermission.any('inventory.view', 'inventory.input', 'inventory.manage');
router.get('/', canReadInventory, inventoryController.list);
router.get('/rop-status', canReadInventory, inventoryController.ropStatus);
// HARUS di atas '/:id' - kalau ditaruh di bawah, '/movements/all' bakal
// ketangkep sebagai '/:id' dengan id='movements' duluan.
router.get('/movements/all', canReadInventory, inventoryController.allMovements);
// Harus SEBELUM '/:id' (kalau tidak, 'movements' dibaca sebagai id).
router.get('/movements/export', canReadInventory, inventoryController.exportMovementsXlsx);
router.get('/:id', canReadInventory, inventoryController.detail);
router.get('/:id/movements', canReadInventory, inventoryController.movements);

// Aksi tulis Inventory dipecah jadi 2 permission:
//   - 'inventory.input'  : TAMBAH item baru + CATAT stok masuk/keluar (input saja).
//   - 'inventory.manage' : EDIT item + HAPUS item (juga boleh input, jadi role
//     yang punya manage tidak perlu dicentang input lagi).
// Admin selalu lolos semuanya.
router.post('/', requirePermission.any('inventory.input', 'inventory.manage'), inventoryController.create);
router.post(
  '/:id/adjust-stock',
  requirePermission.any('inventory.input', 'inventory.manage'),
  inventoryController.adjustStock
);
router.patch('/:id', requirePermission('inventory.manage'), inventoryController.update);
router.delete('/:id', requirePermission('inventory.manage'), inventoryController.remove);

module.exports = router;