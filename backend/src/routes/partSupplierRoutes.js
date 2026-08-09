// src/routes/partSupplierRoutes.js
// GET/POST buat 1 link (nested di bawah /parts/:partId/suppliers, lihat
// partRoutes.js) - route di sini cuma buat operasi yang nyasar ke id link
// itu sendiri, sama pola dengan clMappingRoutes.js (DELETE /cl-mapping/:id).
const express = require('express');
const partSupplierController = require('../controllers/partSupplierController');
const requireAuth = require('../middlewares/authMiddleware');
const requireMasterDataEditAccess = require('../middlewares/masterDataAccess');

const router = express.Router();

router.use(requireAuth);

// PATCH/DELETE - Role sama semua: Admin, atau Operator jika
// allow_operator_edit_master_data=true. Beda dengan DELETE Line/Part/Supplier
// (Admin-only) - ini ngehapus RELASI (kayak cl-mapping), bukan master
// record, jadi ikut akses yang sama dengan bikin relasinya (POST .../suppliers).
router.patch('/:id/notes', requireMasterDataEditAccess, partSupplierController.updateNotes);
router.patch('/:id/primary', requireMasterDataEditAccess, partSupplierController.setPrimary);
router.delete('/:id', requireMasterDataEditAccess, partSupplierController.remove);

module.exports = router;
