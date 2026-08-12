// src/routes/index.js
const express = require('express');
const authRoutes = require('./authRoutes');
const lineRoutes = require('./lineRoutes');
const partRoutes = require('./partRoutes');
const clMappingRoutes = require('./clMappingRoutes');
const pmPartRoutes = require('./pmPartRoutes');
const pmPartHistoryRoutes = require('./pmPartHistoryRoutes');
const pmLineRoutes = require('./pmLineRoutes');
const pmLineHistoryRoutes = require('./pmLineHistoryRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const settingsRoutes = require('./settingsRoutes');
const userManagementRoutes = require('./userManagementRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const masterDataImportRoutes = require('./masterDataImportRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const roleManagementRoutes = require('./roleManagementRoutes');
const reportingRoutes = require('./reportingRoutes');
const supplierRoutes = require('./supplierRoutes');
const partSupplierRoutes = require('./partSupplierRoutes');
const notificationRoutes = require('./notificationRoutes');
const recycleBinRoutes = require('./recycleBinRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/lines', lineRoutes);
router.use('/parts', partRoutes);
router.use('/cl-mapping', clMappingRoutes);
router.use('/pm-part', pmPartRoutes);
router.use('/pm-part-history', pmPartHistoryRoutes);
router.use('/pm-line', pmLineRoutes);
router.use('/pm-line-history', pmLineHistoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/users', userManagementRoutes);
router.use('/audit-log', auditLogRoutes);
router.use('/master-data-import', masterDataImportRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/roles', roleManagementRoutes);
router.use('/reporting', reportingRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/part-suppliers', partSupplierRoutes);
router.use('/notifications', notificationRoutes);
router.use('/recycle-bin', recycleBinRoutes);

module.exports = router;