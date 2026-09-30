// src/routes/partRoutes.js
const express = require('express');
const partController = require('../controllers/partController');
const clMappingController = require('../controllers/clMappingController');
const partSupplierController = require('../controllers/partSupplierController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');
const { REFERENCE_DATA_READ } = require('../middlewares/permissionGroups');
const { requireLicensePackage } = require('../middlewares/licenseMiddleware');

const router = express.Router();

router.use(requireAuth);

// Parts - GET: data referensi, lihat REFERENCE_DATA_READ + catatan di lineRoutes.js.
router.get('/', requirePermission.any(...REFERENCE_DATA_READ), partController.list);

// Lookup exact-match by Drawing No (hasil scan barcode kamera iPad) - akses
// sama dengan list biasa, cuma beda cara matching (exact, bukan ILIKE).
router.get('/lookup', requirePermission.any(...REFERENCE_DATA_READ), partController.lookupByDrawingNo);

// Parts - POST/PATCH: permission 'masterdata.edit'
router.post('/', requirePermission('masterdata.edit'), partController.create);
router.patch('/:id', requirePermission('masterdata.edit'), partController.update);

// Parts - DELETE: permission 'masterdata.delete' (default: cuma Admin)
router.delete('/:id', requirePermission('masterdata.delete'), partController.remove);

// Part-CL Mapping (nested) - GET: data referensi (sama alasan di atas).
router.get('/:partId/cl-mapping', requirePermission.any(...REFERENCE_DATA_READ), clMappingController.list);

// Part-CL Mapping (nested) - POST: sama seperti POST /parts
router.post('/:partId/cl-mapping', requirePermission('masterdata.edit'), clMappingController.create);

// Part-Supplier (nested) - daftar supplier per Part, "pesen kemana buat
// part ini" - fitur Paket B (sama alasan dengan supplierRoutes.js), beda
// dari cl-mapping di atas yang tetap Paket A. requireLicensePackage('B')
// dicek SEBELUM role/permission, gantiin akses "sama persis dengan
// cl-mapping" yang lama.
router.get(
  '/:partId/suppliers',
  requireLicensePackage('B'),
  requirePermission.any(...REFERENCE_DATA_READ),
  partSupplierController.list
);
router.post(
  '/:partId/suppliers',
  requireLicensePackage('B'),
  requirePermission('masterdata.edit'),
  partSupplierController.create
);

// Link/unlink Part ke Inventory Item - dianggap Master Data (konfigurasi
// relasi, bukan transaksi stok) - sama akses dengan edit Part.
const inventoryController = require('../controllers/inventoryController');
router.patch('/:partId/inventory-link', requirePermission('masterdata.edit'), inventoryController.linkPart);

// NOTE: bulk-import (POST /parts/bulk-import) SENGAJA belum diimplementasikan
// di Fase 2. Sesuai 03_API_SPECIFICATION.md §4, endpoint ini "dipakai sekali
// di Fase 2/9 untuk migrasi 1.559 data lama" — akan dibangun di Fase 9
// (bersamaan waktu migrasi data aktual dilakukan) supaya tidak menambah
// dependency (multer, parser CSV/XLSX) sebelum benar-benar dibutuhkan
// (YAGNI, Development Rules §2). Placeholder tidak dibuat sekarang.

module.exports = router;