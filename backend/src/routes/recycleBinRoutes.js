// src/routes/recycleBinRoutes.js
//
// Recycle Bin - ADMIN-ONLY seluruhnya (bukan cuma restore/permanent-delete,
// tapi juga listing-nya - Operator gak perlu tahu ada data apa aja yang
// pernah dihapus). Bulk soft-delete (checkbox massal di tabel Master Data)
// JUGA lewat sini (POST /:entity/bulk-delete) - generik, SKIP guard
// referensial per-baris yang berlaku di delete satuan (lineController.remove
// dkk) - alat power Admin buat testing (SOW: "CRUD diadakan semuanya"),
// tetap aman karena hasilnya reversible lewat Restore.
const express = require('express');
const recycleBinController = require('../controllers/recycleBinController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('Admin'));

router.get('/', recycleBinController.listEntities);
router.get('/:entity', recycleBinController.listDeleted);
router.post('/:entity/bulk-delete', recycleBinController.bulkDelete);
router.post('/:entity/:id/restore', recycleBinController.restore);
router.delete('/:entity/:id', recycleBinController.permanentDelete);

module.exports = router;