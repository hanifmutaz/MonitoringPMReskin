// src/routes/pmPartRoutes.js
const express = require('express');
const pmPartController = require('../controllers/pmPartController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

// View-only - butuh permission 'pm_part.view' (Admin selalu lolos). Role tanpa
// permission ini (mis. Management yang cuma boleh Dashboard) ditolak.
router.use(requireAuth, requirePermission('pm_part.view'));

router.get('/', pmPartController.list);
router.get('/ketepatan-per-line', pmPartController.ketepatanPerLine);
router.get('/:partId', pmPartController.detail);

module.exports = router;
