// src/controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');
const multiSiteService = require('../services/multiSiteService');
const lateLineService = require('../services/lateLineService');
const lineIdleService = require('../services/lineIdleService');
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

// GET /api/dashboard/ketepatan-below-target?period=month|year - semua Line dengan ketepatan < 100%.
const ketepatanBelowTarget = asyncHandler(async (req, res) => {
  const { period } = req.query;
  if (period !== undefined && period !== 'month' && period !== 'year') {
    throw AppError.badRequest('Validasi gagal', { period: "period harus 'month' atau 'year'" });
  }
  const data = await dashboardService.getKetepatanBelowTarget({ period });
  res.status(200).json({ success: true, message: 'Success', data });
});

// GET /api/dashboard/late-lines - Line dengan PM terlambat (ringkas).
const lateLines = asyncHandler(async (req, res) => {
  const data = await lateLineService.getLateLines();
  res.status(200).json({ success: true, message: 'Success', data });
});

// GET /api/dashboard/late-lines/:lineId/evidence - bukti keterlambatan 1 Line.
const lateLineEvidence = asyncHandler(async (req, res) => {
  const lineId = Number(req.params.lineId);
  if (!Number.isInteger(lineId) || lineId <= 0) {
    throw AppError.badRequest('Validasi gagal', { lineId: 'lineId harus bilangan bulat positif' });
  }
  const data = await lateLineService.getLateLineEvidence(lineId);
  res.status(200).json({ success: true, message: 'Success', data });
});

// GET /api/dashboard/idle-lines - Line tidak running + status cleaning.
const idleLines = asyncHandler(async (req, res) => {
  const data = await lineIdleService.getIdleLines();
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
  ketepatanBelowTarget,
  lateLines,
  lateLineEvidence,
  idleLines,
  multiSite,
};