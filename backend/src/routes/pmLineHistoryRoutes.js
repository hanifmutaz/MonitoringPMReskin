// src/routes/pmLineHistoryRoutes.js
const express = require('express');
const pmLineHistoryController = require('../controllers/pmLineHistoryController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

// View-only - butuh permission 'pm_line.view'
router.get('/', requirePermission('pm_line.view'), pmLineHistoryController.list);

// Export .xlsx (filter sama dengan list) - cukup permission view yang sama.
router.get('/export', requirePermission('pm_line.view'), pmLineHistoryController.exportXlsx);

// Submit PM Monthly/Weekly - butuh permission 'pm_line.submit' (lihat
// catatan yang sama di pmPartHistoryRoutes.js: biasanya butuh 'pm_line.view' juga)
router.post('/', requirePermission('pm_line.submit'), pmLineHistoryController.create);

// Edit Keterangan / PIC / Alasan Telat history - permission sama dengan submit ('pm_line.submit').
// Tanggal, jenis PM dan ketepatan TIDAK bisa diubah lewat endpoint ini.
router.patch('/:id', requirePermission('pm_line.submit'), pmLineHistoryController.update);

module.exports = router;
