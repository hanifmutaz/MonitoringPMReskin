// src/controllers/reportingController.js
const dashboardService = require('../services/dashboardService');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reporting/site-summary
// Dipanggil oleh instance LAIN (Internal), bukan browser. Reuse service yang
// sama dengan dashboard biasa - jangan duplikasi query, cukup bungkus ulang
// bentuk response-nya + tag site_id biar pemanggil tau ini data dari mana.
//
// Isinya HARUS nyakup semua data yang dibutuhin 3 halaman dashboard yang
// punya site switcher (Dashboard Management, PM Part, PM Monthly/Weekly) -
// upcoming dan ketepatan_attention ditambahin belakangan justru buat itu,
// bukan cuma summary. line_summary & part_summary sengaja SAMA PERSIS
// bentuknya dengan response GET /dashboard/part-summary & /line-summary
// biar frontend bisa reuse komponen yang sama buat data lokal maupun remote.
const siteSummary = asyncHandler(async (req, res) => {
  const [summary, attention, upcoming, ketepatanAttention, lineSummary, partSummary] = await Promise.all([
    dashboardService.getSummary(),
    dashboardService.getAttention(),
    dashboardService.getUpcoming(),
    dashboardService.getKetepatanAttention(),
    dashboardService.getLineSummary(),
    dashboardService.getPartSummary(),
  ]);

  res.json({
    site_id: env.siteId,
    generated_at: new Date().toISOString(),
    summary,
    attention,
    upcoming,
    ketepatan_attention: ketepatanAttention,
    line_summary: lineSummary,
    part_summary: partSummary,
  });
});

module.exports = { siteSummary };
