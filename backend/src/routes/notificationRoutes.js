// src/routes/notificationRoutes.js
const express = require('express');
const notificationController = require('../controllers/notificationController');
const requireAuth = require('../middlewares/authMiddleware');

const router = express.Router();

// View-only, gak pakai requirePermission granular - notifikasi di sini
// (PM Part Danger, Inventory Order) itu ringkasan dari data yang emang
// udah kebuka buat semua role login (Monitoring PM Part, Inventory), sama
// alasannya kayak dashboardRoutes.js. Bukan data baru yang lebih sensitif.
router.use(requireAuth);

router.get('/', notificationController.list);

module.exports = router;