// src/routes/jenisPenggantianRoutes.js
const express = require('express');
const jenisController = require('../controllers/jenisPenggantianController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(requireAuth);

// GET - semua role login (dipakai dropdown form & filter history PM Part).
router.get('/', jenisController.list);

// POST/PATCH - Admin only. Tidak ada DELETE: jenis yang sudah dipakai riwayat
// cukup dinonaktifkan (is_active = false), lihat migration 1700000027000.
router.post('/', requireRole('Admin'), jenisController.create);
router.patch('/:id', requireRole('Admin'), jenisController.update);

module.exports = router;
