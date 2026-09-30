// src/routes/pmLineRoutes.js
const express = require('express');
const pmLineController = require('../controllers/pmLineController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

// View-only - butuh permission 'pm_line.view' (Admin selalu lolos).
router.use(requireAuth);

router.get('/', requirePermission('pm_line.view'), pmLineController.status);

// Koreksi Tgl PM Terakhir - permission 'pm_line.edit_date' sengaja TIDAK ada di
// katalog Role Management, jadi efektifnya cuma Admin (wildcard '*').
router.patch('/:lineId/last-date', requirePermission('pm_line.edit_date'), pmLineController.updateLastDate);

module.exports = router;
