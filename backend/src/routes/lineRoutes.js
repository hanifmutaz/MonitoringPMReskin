// src/routes/lineRoutes.js
const express = require('express');
const lineController = require('../controllers/lineController');
const requireAuth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const requireMasterDataEditAccess = require('../middlewares/masterDataAccess');

const router = express.Router();

router.use(requireAuth);

// GET - Admin & Operator
router.get('/', requireRole('Admin', 'Operator'), lineController.list);

// POST/PATCH - Admin, atau Operator jika allow_operator_edit_master_data=true
router.post('/', requireMasterDataEditAccess, lineController.create);
router.patch('/:id', requireMasterDataEditAccess, lineController.update);

// DELETE - Admin only
router.delete('/:id', requireRole('Admin'), lineController.remove);

module.exports = router;
