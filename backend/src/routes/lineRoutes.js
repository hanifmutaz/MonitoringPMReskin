// src/routes/lineRoutes.js
const express = require('express');
const lineController = require('../controllers/lineController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const requireMasterDataEditAccess = require('../middlewares/masterDataAccess');

const router = express.Router();

router.use(requireAuth);

// GET - dibuka ke semua role yang sudah login (dulu hardcode 'Admin',
// 'Operator' - efeknya role custom buatan Role Management gak pernah bisa
// lihat Master Data Line sama sekali walau sudah digrant permission lewat
// UI, karena middleware ini cek by NAME literal, bukan permission).
// View-only di sini aman dilihat siapa saja yang punya akun aktif, sama
// pola dengan pmLineRoutes.js/pmPartRoutes.js.
router.get('/', lineController.list);

// POST/PATCH - Admin, atau Operator jika allow_operator_edit_master_data=true
router.post('/', requireMasterDataEditAccess, lineController.create);
router.patch('/:id', requireMasterDataEditAccess, lineController.update);

// DELETE - Admin only
router.delete('/:id', requireRole('Admin'), lineController.remove);

module.exports = router;
