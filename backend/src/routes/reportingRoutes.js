// src/routes/reportingRoutes.js
const express = require('express');
const reportingController = require('../controllers/reportingController');
const requireApiKey = require('../middlewares/apiKeyMiddleware');

const router = express.Router();

// Sengaja TIDAK pakai requireAuth (JWT cookie) - pemanggilnya server lain,
// bukan user login di browser. Lihat apiKeyMiddleware.js.
router.use(requireApiKey);

router.get('/site-summary', reportingController.siteSummary);

module.exports = router;
