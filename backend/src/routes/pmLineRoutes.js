// src/routes/pmLineRoutes.js
const express = require('express');
const pmLineController = require('../controllers/pmLineController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

// View-only - dibuka untuk semua role yang sudah login (Admin, Operator,
// atau role custom apa pun) - monitoring status Line aman dilihat siapa saja
// yang punya akun aktif di sistem ini.
router.use(requireAuth);

router.get('/', pmLineController.status);

// Koreksi Tgl PM Terakhir - permission 'pm_line.edit_date' sengaja TIDAK ada di
// katalog Role Management, jadi efektifnya cuma Admin (wildcard '*').
router.patch('/:lineId/last-date', requirePermission('pm_line.edit_date'), pmLineController.updateLastDate);

module.exports = router;
