// src/routes/partSupplierRoutes.js
// GET/POST buat 1 link (nested di bawah /parts/:partId/suppliers, lihat
// partRoutes.js) - route di sini cuma buat operasi yang nyasar ke id link
// itu sendiri, sama pola dengan clMappingRoutes.js (DELETE /cl-mapping/:id).
const express = require('express');
const partSupplierController = require('../controllers/partSupplierController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(requireAuth);

// PATCH/DELETE - semua pakai 'masterdata.edit'. Beda dengan DELETE
// Line/Part/Supplier ('masterdata.delete') - ini ngehapus RELASI (kayak
// cl-mapping), bukan master record, jadi ikut akses yang sama dengan bikin
// relasinya (POST .../suppliers).
router.patch('/:id/notes', requirePermission('masterdata.edit'), partSupplierController.updateNotes);
router.patch('/:id/primary', requirePermission('masterdata.edit'), partSupplierController.setPrimary);
router.delete('/:id', requirePermission('masterdata.edit'), partSupplierController.remove);

module.exports = router;
