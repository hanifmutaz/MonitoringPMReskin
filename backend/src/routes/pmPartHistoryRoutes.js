// src/routes/pmPartHistoryRoutes.js
const express = require('express');
const pmPartHistoryController = require('../controllers/pmPartHistoryController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

// View-only - dibuka untuk semua role yang login
router.get('/', pmPartHistoryController.list);

// Submit penggantian part (termasuk lewat scan barcode Drawing No) - butuh
// permission 'pm_part.submit'. Admin selalu bypass (superuser). Operator
// di-seed permission ini sejak migration 1700000011000 (behavior lama tetap
// sama), role custom baru (mis. "Purchasing") HARUS di-assign eksplisit
// oleh Admin lewat Role Management kalau memang perlu submit juga.
router.post('/', requirePermission('pm_part.submit'), pmPartHistoryController.create);

module.exports = router;
