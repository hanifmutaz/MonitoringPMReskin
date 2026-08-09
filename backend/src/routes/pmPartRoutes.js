// src/routes/pmPartRoutes.js
const express = require('express');
const pmPartController = require('../controllers/pmPartController');
const requireAuth = require('../middlewares/authMiddleware');

const router = express.Router();

// View-only - sama alasannya dengan pmLineRoutes.js
router.use(requireAuth);

router.get('/', pmPartController.list);
router.get('/ketepatan-per-line', pmPartController.ketepatanPerLine);
router.get('/:partId', pmPartController.detail);

module.exports = router;
