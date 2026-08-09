// src/routes/roleManagementRoutes.js
const express = require('express');
const roleManagementController = require('../controllers/roleManagementController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

// Kelola role & permission tetap Admin-only (bukan dibuka lewat sistem
// permission baru) - terlalu sensitif untuk didelegasikan (kalau role lain
// bisa assign permission, mereka bisa kasih diri sendiri akses apa pun).
router.use(requireAuth, requireRole('Admin'));

router.get('/', roleManagementController.list);
router.get('/permissions', roleManagementController.listPermissions);
router.post('/', roleManagementController.create);
router.patch('/:id', roleManagementController.update);
router.patch('/:id/permissions', roleManagementController.updatePermissions);
router.delete('/:id', roleManagementController.remove);

module.exports = router;
