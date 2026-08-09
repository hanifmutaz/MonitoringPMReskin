// src/routes/pmLineHistoryRoutes.js
const express = require('express');
const pmLineHistoryController = require('../controllers/pmLineHistoryController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();
router.use(requireAuth);

// View-only - dibuka untuk semua role yang login
router.get('/', pmLineHistoryController.list);

// Submit PM Monthly/Weekly - butuh permission 'pm_line.submit' (lihat
// catatan yang sama di pmPartHistoryRoutes.js)
router.post('/', requirePermission('pm_line.submit'), pmLineHistoryController.create);

module.exports = router;
