// src/controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');
const multiSiteService = require('../services/multiSiteService');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary();
  res.status(200).json({ success: true, message: 'Success', data });
});

const attention = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAttention();
  res.status(200).json({ success: true, message: 'Success', data });
});

const upcoming = asyncHandler(async (req, res) => {
  const data = await dashboardService.getUpcoming();
  res.status(200).json({ success: true, message: 'Success', data });
});

const syncStatus = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSyncStatus();
  res.status(200).json({ success: true, message: 'Success', data });
});

const partSummary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getPartSummary();
  res.status(200).json({ success: true, message: 'Success', data });
});

const lineSummary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getLineSummary();
  res.status(200).json({ success: true, message: 'Success', data });
});

const ketepatanAttention = asyncHandler(async (req, res) => {
  const data = await dashboardService.getKetepatanAttention();
  res.status(200).json({ success: true, message: 'Success', data });
});

// GET /api/dashboard/multi-site
// Cuma bermakna di instance Internal (satu-satunya yang boleh narik data
// Subcont - lihat topologi 1-arah di doc/Architecture.md). Instance Subcont
// nolak dengan 403 kalau route ini kepanggil, daripada nampilin data kosong
// yang membingungkan.
const multiSite = asyncHandler(async (req, res) => {
  if (env.siteId !== 'internal') {
    throw AppError.forbidden('Endpoint ini cuma tersedia di instance Internal');
  }
  const data = await multiSiteService.getMultiSiteSummary();
  res.status(200).json({ success: true, message: 'Success', data });
});

module.exports = {
  summary,
  attention,
  upcoming,
  syncStatus,
  partSummary,
  lineSummary,
  ketepatanAttention,
  multiSite,
};