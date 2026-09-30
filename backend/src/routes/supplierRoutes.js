// src/routes/supplierRoutes.js
const express = require('express');
const supplierController = require('../controllers/supplierController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');
const { REFERENCE_DATA_READ } = require('../middlewares/permissionGroups');
const { requireLicensePackage } = require('../middlewares/licenseMiddleware');

const router = express.Router();

router.use(requireAuth);
// Supplier itu fitur Paket B (SOW Paket A cuma nyebut "machine, line, and
// part master data" - Supplier gak termasuk, murni buat kebutuhan
// procurement/reorder yang emang scope Paket B). Sama pola dengan
// inventoryRoutes.js: dicek SETELAH auth, SEBELUM role/permission - paket
// adalah boundary produk, lebih besar dari role.
router.use(requireLicensePackage('B'));

// GET - data referensi (lihat catatan di lineRoutes.js / REFERENCE_DATA_READ).
router.get('/', requirePermission.any(...REFERENCE_DATA_READ), supplierController.list);
router.get('/:id', requirePermission.any(...REFERENCE_DATA_READ), supplierController.detail);

// POST/PATCH - butuh 'masterdata.edit'; DELETE - butuh 'masterdata.delete'.
router.post('/', requirePermission('masterdata.edit'), supplierController.create);
router.patch('/:id', requirePermission('masterdata.edit'), supplierController.update);
router.delete('/:id', requirePermission('masterdata.delete'), supplierController.remove);

module.exports = router;