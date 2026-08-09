// src/routes/auditLogRoutes.js
const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('Admin'));

router.get('/', auditLogController.list);

module.exports = router;
