// src/routes/dashboardRoutes.js
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

// View-only - sama alasannya dengan pmLineRoutes.js
router.use(requireAuth);

router.get('/summary', dashboardController.summary);
router.get('/attention', dashboardController.attention);
router.get('/upcoming', dashboardController.upcoming);
router.get('/sync-status', dashboardController.syncStatus);
router.get('/part-summary', dashboardController.partSummary);
router.get('/line-summary', dashboardController.lineSummary);
router.get('/ketepatan-attention', dashboardController.ketepatanAttention);

// Beda dari endpoint lain di atas (yang view-only buat semua user login) -
// ini butuh permission granular 'dashboard.multi_site' karena narik data
// dari Subcont lain, gak semua role perlu/pantas liat itu. Admin selalu
// bypass otomatis (lihat permissionMiddleware.js).
router.get('/multi-site', requirePermission('dashboard.multi_site'), dashboardController.multiSite);

module.exports = router;