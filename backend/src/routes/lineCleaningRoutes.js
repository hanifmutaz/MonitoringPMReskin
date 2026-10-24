// src/routes/lineCleaningRoutes.js
const express = require('express');
const lineCleaningController = require('../controllers/lineCleaningController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(requireAuth);

// Lihat riwayat cleaning sebuah Line - cukup permission lihat PM Line.
router.get('/', requirePermission('pm_line.view'), lineCleaningController.list);

// Catat cleaning Line tidak running - permission yang sama dengan submit PM Line.
router.post('/', requirePermission('pm_line.submit'), lineCleaningController.create);

module.exports = router;
