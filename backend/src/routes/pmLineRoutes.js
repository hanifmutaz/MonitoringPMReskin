// src/routes/pmLineRoutes.js
const express = require('express');
const pmLineController = require('../controllers/pmLineController');
const requireAuth = require('../middlewares/authMiddleware');

const router = express.Router();

// View-only - dibuka untuk semua role yang sudah login (Admin, Operator,
// atau role custom apa pun) - monitoring status Line aman dilihat siapa saja
// yang punya akun aktif di sistem ini.
router.use(requireAuth);

router.get('/', pmLineController.status);

module.exports = router;
