// src/routes/auditLogRoutes.js
const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

// Butuh permission 'auditlog.view' (Admin selalu lolos) - bisa didelegasikan
// ke role non-Admin (mis. Supervisor) tanpa jadi Admin.
router.use(requireAuth, requirePermission('auditlog.view'));

router.get('/', auditLogController.list);

// Export .xlsx (filter sama dengan list) - permission yang sama dengan view.
router.get('/export', auditLogController.exportXlsx);

module.exports = router;
