// src/routes/supplierRoutes.js
const express = require('express');
const supplierController = require('../controllers/supplierController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const requireMasterDataEditAccess = require('../middlewares/masterDataAccess');
const { requireLicensePackage } = require('../middlewares/licenseMiddleware');

const router = express.Router();

router.use(requireAuth);
// Supplier itu fitur Paket B (SOW Paket A cuma nyebut "machine, line, and
// part master data" - Supplier gak termasuk, murni buat kebutuhan
// procurement/reorder yang emang scope Paket B). Sama pola dengan
// inventoryRoutes.js: dicek SETELAH auth, SEBELUM role/permission - paket
// adalah boundary produk, lebih besar dari role.
router.use(requireLicensePackage('B'));

// GET - Admin & Operator (sama pola dengan lineRoutes.js/partRoutes.js)
router.get('/', requireRole('Admin', 'Operator'), supplierController.list);
router.get('/:id', requireRole('Admin', 'Operator'), supplierController.detail);

// POST/PATCH - Admin, atau Operator jika allow_operator_edit_master_data=true
router.post('/', requireMasterDataEditAccess, supplierController.create);
router.patch('/:id', requireMasterDataEditAccess, supplierController.update);

// DELETE - Admin only
router.delete('/:id', requireRole('Admin'), supplierController.remove);

module.exports = router;