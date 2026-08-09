// src/routes/settingsRoutes.js
const express = require('express');
const settingsController = require('../controllers/settingsController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('Admin'));

router.get('/', settingsController.list);
router.patch('/:key', settingsController.update);

module.exports = router;
