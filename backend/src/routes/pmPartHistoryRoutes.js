// src/routes/pmPartHistoryRoutes.js
const express = require('express');
const pmPartHistoryController = require('../controllers/pmPartHistoryController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

// View-only - butuh permission 'pm_part.view'
router.get('/', requirePermission('pm_part.view'), pmPartHistoryController.list);

// Submit penggantian part (termasuk lewat scan barcode Drawing No) - butuh
// permission 'pm_part.submit'. Admin selalu bypass (superuser). Role
// non-Admin HARUS di-assign eksplisit oleh Admin lewat Role Management.
// Catatan: tombol input ada di halaman Monitoring, jadi role penginput
// biasanya butuh 'pm_part.view' + 'pm_part.submit'.
router.post('/', requirePermission('pm_part.submit'), pmPartHistoryController.create);

module.exports = router;
