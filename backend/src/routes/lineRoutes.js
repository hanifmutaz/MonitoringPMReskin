// src/routes/lineRoutes.js
const express = require('express');
const lineController = require('../controllers/lineController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');
const { REFERENCE_DATA_READ } = require('../middlewares/permissionGroups');

const router = express.Router();

router.use(requireAuth);

// GET - data referensi: dibaca halaman Master Data DAN jadi dropdown di form
// input PM/Inventory, jadi boleh untuk role yang punya salah satu permission
// modul terkait (lihat REFERENCE_DATA_READ). Role tanpa satupun (mis.
// Management yang cuma boleh Dashboard) ditolak.
router.get('/', requirePermission.any(...REFERENCE_DATA_READ), lineController.list);

// POST/PATCH - butuh permission 'masterdata.edit' (Admin selalu lolos).
router.post('/', requirePermission('masterdata.edit'), lineController.create);
router.patch('/:id', requirePermission('masterdata.edit'), lineController.update);

// DELETE - butuh permission 'masterdata.delete' (default: cuma Admin).
router.delete('/:id', requirePermission('masterdata.delete'), lineController.remove);

module.exports = router;
