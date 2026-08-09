// src/services/multiSiteService.js
// Hanya bermakna di instance Internal (env.reporting.remoteSites kosong di
// instance Subcont, jadi otomatis no-op di sana). Narik GET /reporting/site-summary
// dari tiap Subcont yang dikonfigurasi, secara paralel, dan gak boleh 1
// Subcont yang down bikin seluruh dashboard ikut error - itu sebabnya pakai
// Promise.allSettled + cache "data terakhir yang berhasil" per site.
const env = require('../config/env');
const dashboardService = require('./dashboardService');
const logger = require('../utils/logger');

// Cache in-memory per site_id: { data, fetchedAt }. Sengaja bukan di DB -
// ini cuma buat nampilin "data terakhir yang sempet berhasil ditarik" pas
// Subcont lagi unreachable, bukan sumber kebenaran (source of truth tetap
// di masing-masing instance).
const lastKnownGood = new Map();

async function fetchSite(site) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.reporting.fetchTimeoutMs);

  try {
    const res = await fetch(`${site.baseUrl}/api/v1/reporting/site-summary`, {
      headers: { 'X-API-Key': site.apiKey },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    lastKnownGood.set(site.id, { data, fetchedAt: new Date().toISOString() });

    return {
      site_id: site.id,
      site_label: site.label,
      status: 'ok',
      fetched_at: new Date().toISOString(),
      data,
    };
  } catch (err) {
    logger.warn(`[multiSite] Gagal narik data dari site "${site.id}"`, { message: err.message });

    const cached = lastKnownGood.get(site.id);
    return {
      site_id: site.id,
      site_label: site.label,
      status: cached ? 'stale' : 'unreachable',
      fetched_at: cached ? cached.fetchedAt : null,
      data: cached ? cached.data : null,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Data lokasi Internal sendiri diambil langsung dari dashboardService (gak
// perlu HTTP call ke diri sendiri) supaya bentuk responsenya konsisten
// dengan hasil dari Subcont. Field-nya HARUS sinkron sama reportingController.js
// - kalau nambah field di situ, tambahin juga di sini.
async function getOwnSiteAsRemoteShape() {
  const [summary, attention, upcoming, ketepatanAttention, lineSummary, partSummary] = await Promise.all([
    dashboardService.getSummary(),
    dashboardService.getAttention(),
    dashboardService.getUpcoming(),
    dashboardService.getKetepatanAttention(),
    dashboardService.getLineSummary(),
    dashboardService.getPartSummary(),
  ]);

  return {
    site_id: env.siteId,
    site_label: 'Internal',
    status: 'ok',
    fetched_at: new Date().toISOString(),
    data: {
      site_id: env.siteId,
      generated_at: new Date().toISOString(),
      summary,
      attention,
      upcoming,
      ketepatan_attention: ketepatanAttention,
      line_summary: lineSummary,
      part_summary: partSummary,
    },
  };
}

async function getMultiSiteSummary() {
  const [own, ...remotes] = await Promise.all([
    getOwnSiteAsRemoteShape(),
    ...env.reporting.remoteSites.map(fetchSite),
  ]);

  return [own, ...remotes];
}

module.exports = { getMultiSiteSummary };
