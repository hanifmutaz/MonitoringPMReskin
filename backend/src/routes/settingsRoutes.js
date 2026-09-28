// src/routes/settingsRoutes.js
const express = require('express');
const settingsController = require('../controllers/settingsController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(requireAuth);

// GET - dibuka ke SEMUA role yang sudah login (dulu Admin only) - supaya
// role yang digrant akses edit ke sebagian setting (setting_role_access,
// migration 1700000022000) bisa buka halaman Settings sama sekali. Role
// tanpa grant apa pun tetap bisa lihat (read-only) 9 kategori settingnya,
// cuma gak akan ada tombol Edit yang aktif di frontend.
router.get('/', settingsController.list);

// PATCH /:key - akses per-key dicek DI DALAM settingsService.updateSetting
// (Admin selalu boleh, role lain butuh grant di setting_role_access) - bukan
// requireRole('Admin') blanket lagi.
router.patch('/:key', settingsController.update);

// PATCH /:key/access - ngatur GRANT-nya sendiri tetap Admin only (siapa
// yang boleh kasih akses ke role lain harus superuser).
router.patch('/:key/access', requireRole('Admin'), settingsController.updateAccess);

// POST /sync-conmas - trigger manual sync ConMas, Admin only (lihat catatan
// di settingsController.js).
router.post('/sync-conmas', requireRole('Admin'), settingsController.syncNow);

module.exports = router;
