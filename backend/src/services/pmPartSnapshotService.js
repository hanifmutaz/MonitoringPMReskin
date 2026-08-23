// src/services/pmPartSnapshotService.js
//
// Full recompute snapshot pm_part_status_snapshot - pola SAMA PERSIS
// dengan ADR 006 (pmMonthlyAccrualService.recomputeAllLines()): idempotent,
// aman dipanggil berkali-kali / kalau job telat / gagal di tengah jalan.
// Lihat migration 1700000021000 untuk latar belakang lengkap kenapa
// snapshot ini dibutuhkan (TECHNICAL_DEBT.md #1).
//
// PENTING: formula status/threshold TETAP di pmPartService.computeMetrics()
// (Development Rules §7 - business logic tidak boleh di SQL layer). Modul
// ini cuma pipa: panggil computeMetrics untuk semua part, tulis hasilnya.

const pmPartService = require('./pmPartService');
const pmPartStatusSnapshotQueries = require('../sql/pmPartStatusSnapshotQueries');
const logger = require('../utils/logger');

async function recomputeAll() {
  const metrics = await pmPartService.getAllComputedMetrics();
  await pmPartStatusSnapshotQueries.replaceAll(metrics);

  logger.info(`Recompute PM Part status snapshot selesai (${metrics.length} part)`);
  return { partsSnapshotted: metrics.length };
}

module.exports = { recomputeAll };
