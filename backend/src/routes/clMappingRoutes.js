// src/routes/clMappingRoutes.js
const express = require('express');
const clMappingController = require('../controllers/clMappingController');
const requireAuth = require('../middlewares/authMiddleware');
const requireMasterDataEditAccess = require('../middlewares/masterDataAccess');

const router = express.Router();

router.use(requireAuth);

// DELETE /cl-mapping/:id - Role: sama seperti POST cl-mapping (Admin, atau Operator jika toggle aktif)
router.delete('/:id', requireMasterDataEditAccess, clMappingController.remove);

module.exports = router;
