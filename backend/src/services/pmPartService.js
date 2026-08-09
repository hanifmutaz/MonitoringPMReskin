// src/services/pmPartService.js
//
// Implementasi formula MASTER DOCUMENT Bagian 2.A — TIDAK DIUBAH:
//   1. Counter Saat Ini   = SUM cross-CL sejak Tgl Pasang Terakhir (SQL layer)
//   2. Sisa Shot          = Target Shot - Counter Saat Ini
//   3. Pemakaian/Hari     = rata-rata gabungan Output Actual per hari
//                           (diturunkan dari Counter / jumlah hari sejak
//                           Tgl Pasang Terakhir — karena Counter sudah
//                           merupakan SUM gabungan semua CL No yang share
//                           part itu, lihat Bagian 2.A poin 1 & 3)
//   4. Estimasi Tanggal PM = Hari ini + (Sisa Shot / Pemakaian per Hari)
//   5. Status (threshold dari app_settings, BUKAN hardcode — Dev Rules §18):
//        Sisa Shot <= danger_multiplier  * Pemakaian/Hari -> DANGER
//        Sisa Shot <  warning_multiplier * Pemakaian/Hari -> WARNING
//        selain itu -> OK
//   6. Hasil % (wear_percentage) = Counter / Target Shot * 100

const pmPartQueries = require('../sql/pmPartQueries');
const clMappingQueries = require('../sql/clMappingQueries');
const partSupplierQueries = require('../sql/partSupplierQueries');
const settingsService = require('./settingsService');
const pmPartHistoryService = require('./pmPartHistoryService');
const dateUtils = require('../utils/dateUtils');
const AppError = require('../utils/AppError');

function computeMetrics(row, thresholds) {
  const targetShot = Number(row.target_shot);
  const counter = Number(row.counter);
  const remainingShot = targetShot - counter;

  const daysSinceInstall = dateUtils.daysSince(row.last_tgl_ganti);
  const usagePerDay =
    daysSinceInstall && daysSinceInstall > 0 ? counter / daysSinceInstall : 0;

  let status = 'OK';
  let estimatedPmDate = null;

  if (usagePerDay > 0) {
    if (remainingShot <= thresholds.danger * usagePerDay) {
      status = 'DANGER';
    } else if (remainingShot < thresholds.warning * usagePerDay) {
      status = 'WARNING';
    }
    estimatedPmDate = dateUtils.addDaysToToday(Math.max(remainingShot, 0) / usagePerDay);
  } else {
    if (remainingShot <= 0) {
      status = 'DANGER';
      estimatedPmDate = dateUtils.todayString();
    }
  }

  const wearPercentage = targetShot > 0 ? Math.round((counter / targetShot) * 100) : 0;

  return {
    part_id: row.part_id,
    line_id: row.line_id,
    line_name: row.line_name,
    jig_name: row.jig_name,
    drawing_no: row.drawing_no,
    part_name: row.part_name,
    counter,
    target_shot: targetShot,
    remaining_shot: remainingShot,
    usage_per_day: Math.round(usagePerDay * 100) / 100,
    estimated_pm_date: estimatedPmDate,
    status,
    wear_percentage: wearPercentage,
    // "Pesen kemana" - Supplier yang ditandai utama buat part ini (null
    // kalau belum ada/belum ditandai). Diikutkan di sini (bukan cuma di
    // detail) karena justru paling kepake pas lagi liat Monitoring dan part
    // udah DANGER - operator langsung tau kontak siapa tanpa buka halaman lain.
    primary_supplier_name: row.primary_supplier_name || null,
  };
}

async function getThresholds() {
  const settings = await settingsService.getSettings(['pm_part_danger_multiplier', 'pm_part_warning_multiplier']);
  return {
    danger: settings.pm_part_danger_multiplier,
    warning: settings.pm_part_warning_multiplier,
  };
}

async function getAllComputedMetrics({ lineId, search } = {}) {
  const thresholds = await getThresholds();
  const rows = await pmPartQueries.findAllWithCounter({ lineId, search });
  return rows.map((row) => computeMetrics(row, thresholds));
}

async function listPmPart({ lineId, status, search, page, limit }) {
  const pageNum = Number(page) > 0 ? Number(page) : 1;
  const limitNum = Number(limit) > 0 ? Number(limit) : 20;

  if (!status) {
    const offset = (pageNum - 1) * limitNum;
    const thresholds = await getThresholds();
    const [rows, total] = await Promise.all([
      pmPartQueries.findAllWithCounter({ lineId, search, limit: limitNum, offset }),
      pmPartQueries.countAll({ lineId, search }),
    ]);
    const items = rows.map((row) => computeMetrics(row, thresholds));
    return { items, total, page: pageNum, limit: limitNum };
  }

  let computed = await getAllComputedMetrics({ lineId, search });
  computed = computed.filter((item) => item.status === status.toUpperCase());

  const total = computed.length;
  const start = (pageNum - 1) * limitNum;
  const items = computed.slice(start, start + limitNum);

  return { items, total, page: pageNum, limit: limitNum };
}

async function getPmPartDetail(partId) {
  const thresholds = await getThresholds();
  const row = await pmPartQueries.findOneWithCounter(partId);
  if (!row) {
    throw AppError.notFound('Part tidak ditemukan');
  }

  const metrics = computeMetrics(row, thresholds);
  const clMappings = await clMappingQueries.findByPartId(partId);
  const suppliers = await partSupplierQueries.findByPartId(partId);
  const recentHistory = await pmPartQueries.findRecentHistory(partId, 5);

  return {
    ...metrics,
    cl_mapping: clMappings,
    suppliers,
    recent_history: recentHistory.map((h) => ({
      id: h.id,
      tgl_ganti: dateUtils.formatDate(h.tgl_ganti),
      shift: h.shift,
      counter_saat_diganti: Number(h.counter_saat_diganti),
      jenis_penggantian: h.jenis_penggantian,
      remark: h.remark,
      user_full_name: h.user_full_name,
    })),
  };
}

// Ketepatan PM Part per Line (tahun berjalan) - dipakai halaman Monitoring
// PM Part yang list-nya per-part, jadi butuh ringkasan per-Line terpisah
// (lihat pmPartHistoryService.js buat definisi ketepatan on_time).
async function getKetepatanPerLine() {
  return pmPartHistoryService.getKetepatanPerLine();
}

module.exports = { listPmPart, getPmPartDetail, getAllComputedMetrics, computeMetrics, getKetepatanPerLine };