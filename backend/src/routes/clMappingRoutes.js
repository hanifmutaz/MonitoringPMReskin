// src/routes/clMappingRoutes.js
const express = require('express');
const clMappingController = require('../controllers/clMappingController');
const requireAuth = require('../middlewares/authMiddleware');
const requirePermission = require('../middlewares/permissionMiddleware');

const router = express.Router();

router.use(requireAuth);

// DELETE /cl-mapping/:id - permission sama seperti POST cl-mapping ('masterdata.edit')
router.delete('/:id', requirePermission('masterdata.edit'), clMappingController.remove);

module.exports = router;
