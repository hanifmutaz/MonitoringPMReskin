// src/services/dashboardService.test.js
//
// Unit test business logic aggregation dashboardService.js (bukan cache
// mechanics-nya - itu ada di dashboardService.cache.test.js). Semua
// dependency (pmPartService, pmLineService, dashboardQueries, dkk) di-mock
// biar test ini murni cek logic gabungan/filter/sort, tanpa butuh Postgres.
//
// Menutup TECHNICAL_DEBT.md #3 untuk dashboardService — sebelumnya nol test.

const { test, describe, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const pmPartService = require('./pmPartService');
const pmLineService = require('./pmLineService');
const dashboardQueries = require('../sql/dashboardQueries');
const pmPartHistoryService = require('./pmPartHistoryService');
const pmLineHistoryService = require('./pmLineHistoryService');
const settingsService = require('./settingsService');
const dateUtils = require('../utils/dateUtils');

const dashboardService = require('./dashboardService');

// Offset waktu monoton naik supaya cache internal dashboardService.js
// (module-level singleton, TTL 5000ms) tidak nyangkut hasil test
// sebelumnya - pola sama seperti dashboardService.cache.test.js.
let cacheBustOffsetMs = 0;

function part(overrides = {}) {
  return {
    line_name: 'CL-01',
    part_name: 'Punch A',
    status: 'OK',
    remaining_shot: 100000,
    estimated_pm_date: null,
    ...overrides,
  };
}

function line(overrides = {}) {
  return {
    line_id: 1,
    line_name: 'CL-01',
    status_monthly: 'OK',
    status_weekly: 'OK',
    sisa_hari_monthly: null,
    sisa_hari_weekly: null,
    ...overrides,
  };
}

function stubDefaults() {
  mock.method(dashboardQueries, 'countAllParts', async () => 0);
  mock.method(dashboardQueries, 'countActiveLines', async () => 0);
  mock.method(pmPartHistoryService, 'getKetepatanSummary', async () => ({ percentage: 0, total: 0 }));
  mock.method(pmLineHistoryService, 'getKetepatanSummary', async () => ({
    monthly: { percentage: 0, total: 0 },
    weekly: { percentage: 0, total: 0 },
  }));
  mock.method(settingsService, 'getSetting', async () => 10);
}

describe('dashboardService', () => {
  beforeEach(() => {
    mock.restoreAll();
    mock.timers.enable({ apis: ['Date'] });
    cacheBustOffsetMs += 10 * 24 * 60 * 60 * 1000;
    mock.timers.tick(cacheBustOffsetMs);
    stubDefaults();
  });

  afterEach(() => {
    mock.timers.reset();
  });

  describe('getSummary', () => {
    test('status_counts part & line_buckets dihitung benar dari data campuran', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ status: 'OK' }),
        part({ status: 'WARNING' }),
        part({ status: 'DANGER' }),
        part({ status: 'DANGER' }),
      ]);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ status_monthly: 'OK', status_weekly: 'OK' }),
        line({ status_monthly: 'WARNING', status_weekly: 'OK' }),
        line({ status_monthly: 'OK', status_weekly: 'DANGER' }),
      ]);

      const result = await dashboardService.getSummary();

      assert.equal(result.status_ok, 1);
      assert.equal(result.status_warning, 1);
      assert.equal(result.status_danger, 2);
      // line bucket pakai worstStatus(monthly, weekly): OK/OK->OK, WARNING/OK->WARNING, OK/DANGER->DANGER
      assert.equal(result.lines_healthy, 1);
      assert.equal(result.lines_warning, 1);
      assert.equal(result.lines_critical, 1);
    });

    test('line dengan status_monthly WARNING dan status_weekly DANGER masuk bucket DANGER (ambil yang TERBURUK, bukan salah satu)', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ status_monthly: 'WARNING', status_weekly: 'DANGER' }),
      ]);

      const result = await dashboardService.getSummary();

      assert.equal(result.lines_critical, 1);
      assert.equal(result.lines_warning, 0);
    });
  });

  describe('getAttention', () => {
    test('cuma part WARNING/DANGER yang muncul, OK di-filter keluar; diurutkan dari remaining_shot PALING KECIL', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ part_name: 'Aman', status: 'OK', remaining_shot: 999999 }),
        part({ part_name: 'Kritis', status: 'DANGER', remaining_shot: 100 }),
        part({ part_name: 'Waspada', status: 'WARNING', remaining_shot: 5000 }),
      ]);

      const result = await dashboardService.getAttention();

      assert.equal(result.length, 2);
      assert.equal(result[0].part_name, 'Kritis');
      assert.equal(result[1].part_name, 'Waspada');
    });

    test('dibatasi oleh setting dashboard_upcoming_pm_limit dari settingsService', async () => {
      mock.method(settingsService, 'getSetting', async () => 2);
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ part_name: 'A', status: 'DANGER', remaining_shot: 1 }),
        part({ part_name: 'B', status: 'DANGER', remaining_shot: 2 }),
        part({ part_name: 'C', status: 'DANGER', remaining_shot: 3 }),
      ]);

      const result = await dashboardService.getAttention();
      assert.equal(result.length, 2);
    });

    test('setting kosong (null/undefined dari DB) -> fallback default limit 10, bukan crash/limit 0', async () => {
      mock.method(settingsService, 'getSetting', async () => null);
      const parts = Array.from({ length: 15 }, (_, i) => part({ part_name: `P${i}`, status: 'DANGER', remaining_shot: i }));
      mock.method(pmPartService, 'getAllComputedMetrics', async () => parts);

      const result = await dashboardService.getAttention();
      assert.equal(result.length, 10);
    });
  });

  describe('getUpcoming', () => {
    test('PM Part dengan estimated_pm_date di luar window 7 hari (terlalu jauh) TIDAK muncul', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ part_name: 'Jauh', estimated_pm_date: dateUtils.addDaysToToday(30) }),
      ]);
      mock.method(pmLineService, 'getPmLineStatus', async () => []);

      const result = await dashboardService.getUpcoming();
      assert.equal(result.length, 0);
    });

    test('PM Part dengan estimated_pm_date SUDAH LEWAT (di masa lalu) TIDAK muncul di window "upcoming"', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ part_name: 'Lewat', estimated_pm_date: dateUtils.addDaysToToday(-5) }),
      ]);
      mock.method(pmLineService, 'getPmLineStatus', async () => []);

      const result = await dashboardService.getUpcoming();
      assert.equal(result.length, 0);
    });

    test('PM Part dalam window 7 hari ke depan MUNCUL sebagai type PM_PART', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ part_name: 'Segera', estimated_pm_date: dateUtils.addDaysToToday(3) }),
      ]);
      mock.method(pmLineService, 'getPmLineStatus', async () => []);

      const result = await dashboardService.getUpcoming();
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'PM_PART');
      assert.equal(result[0].label, 'Segera');
    });

    test('PM Line Monthly & Weekly dihitung dari sisa_hari_* (bukan tanggal langsung), dan sisa_hari negatif di-clamp ke 0 (overdue -> hari ini, bukan tanggal mundur)', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ line_name: 'CL-Overdue', sisa_hari_monthly: -10, status_monthly: 'DANGER' }),
      ]);

      const result = await dashboardService.getUpcoming();
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'PM_LINE_MONTHLY');
      assert.equal(result[0].estimated_date, dateUtils.todayString(), 'overdue harus di-clamp ke hari ini, bukan negative date');
    });

    test('hasil digabung dari Part + Line Monthly + Line Weekly, diurutkan berdasarkan estimated_date ASCENDING', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ part_name: 'Part-H5', estimated_pm_date: dateUtils.addDaysToToday(5) }),
      ]);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ line_name: 'Line-H1', sisa_hari_monthly: 1, status_monthly: 'WARNING' }),
        line({ line_name: 'Line-H3', sisa_hari_weekly: 3, status_weekly: 'OK' }),
      ]);

      const result = await dashboardService.getUpcoming();

      assert.equal(result.length, 3);
      assert.equal(result[0].label, 'PM Monthly');
      assert.equal(result[1].label, 'PM Weekly');
      assert.equal(result[2].label, 'Part-H5');
    });
  });

  describe('getSyncStatus', () => {
    test('belum pernah sync (row null) -> status fail, rows_synced 0', async () => {
      mock.method(dashboardQueries, 'getLastSyncInfo', async () => null);
      const result = await dashboardService.getSyncStatus();
      assert.deepEqual(result, { last_synced_at: null, status: 'fail', rows_synced: 0 });
    });

    test('sudah pernah sync -> status success, rows_synced ikut row (fallback 0 kalau null)', async () => {
      mock.method(dashboardQueries, 'getLastSyncInfo', async () => ({
        last_synced_at: '2026-08-01T00:00:00Z',
        rows_synced: null,
      }));
      const result = await dashboardService.getSyncStatus();
      assert.equal(result.status, 'success');
      assert.equal(result.rows_synced, 0);
    });
  });

  describe('getPartSummary', () => {
    test('per_line diurutkan DANGER terbanyak dulu, lalu WARNING terbanyak (bukan alfabetis)', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ line_name: 'Z-Line', status: 'OK' }),
        part({ line_name: 'A-Line', status: 'DANGER' }),
        part({ line_name: 'A-Line', status: 'DANGER' }),
        part({ line_name: 'M-Line', status: 'WARNING' }),
      ]);

      const result = await dashboardService.getPartSummary();

      assert.equal(result.per_line[0].line_name, 'A-Line');
      assert.equal(result.per_line[0].DANGER, 2);
    });

    test('top_attention maksimal 10 item meski part DANGER/WARNING lebih banyak', async () => {
      const parts = Array.from({ length: 20 }, (_, i) => part({ part_name: `P${i}`, status: 'DANGER', remaining_shot: i }));
      mock.method(pmPartService, 'getAllComputedMetrics', async () => parts);

      const result = await dashboardService.getPartSummary();
      assert.equal(result.top_attention.length, 10);
    });
  });

  describe('getLineSummary', () => {
    test('monthly & weekly bucket dihitung TERPISAH (1 line bisa masuk 2 bucket berbeda)', async () => {
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ status_monthly: 'DANGER', status_weekly: 'OK' }),
      ]);

      const result = await dashboardService.getLineSummary();

      assert.equal(result.monthly.DANGER, 1);
      assert.equal(result.monthly.OK, 0);
      assert.equal(result.weekly.OK, 1);
      assert.equal(result.weekly.DANGER, 0);
    });

    test('line dengan monthly & weekly SAMA-SAMA OK tidak masuk daftar attention', async () => {
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ line_name: 'Sehat', status_monthly: 'OK', status_weekly: 'OK' }),
        line({ line_name: 'Bermasalah', status_monthly: 'WARNING', status_weekly: 'OK' }),
      ]);

      const result = await dashboardService.getLineSummary();

      assert.equal(result.attention.length, 1);
      assert.equal(result.attention[0].line_name, 'Bermasalah');
    });
  });

  describe('getKetepatanAttention', () => {
    test('worst_percentage diambil dari nilai TERKECIL antara part/monthly/weekly per Line', async () => {
      mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => [
        { line_id: 1, line_name: 'CL-01', percentage: 90 },
      ]);
      mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => [
        { line_id: 1, line_name: 'CL-01', monthly: { percentage: 40 }, weekly: { percentage: 80 } },
      ]);

      const result = await dashboardService.getKetepatanAttention();

      assert.equal(result[0].worst_percentage, 40);
    });

    test('Line yang cuma punya data Part (belum ada histori Monthly/Weekly) tetap muncul, field kosong tetap null bukan 0', async () => {
      mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => [
        { line_id: 9, line_name: 'CL-Baru', percentage: 75 },
      ]);
      mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => []);

      const result = await dashboardService.getKetepatanAttention();

      assert.equal(result[0].monthly_percentage, null);
      assert.equal(result[0].weekly_percentage, null);
      assert.equal(result[0].worst_percentage, 75);
    });

    test('diurutkan ascending (worst_percentage TERKECIL dulu) dan dipotong maksimal 5', async () => {
      const partRows = Array.from({ length: 8 }, (_, i) => ({ line_id: i, line_name: `L${i}`, percentage: 100 - i }));
      mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => partRows);
      mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => []);

      const result = await dashboardService.getKetepatanAttention();

      assert.equal(result.length, 5);
      assert.equal(result[0].line_name, 'L7'); // percentage terkecil = 93
      assert.ok(result[0].worst_percentage <= result[1].worst_percentage);
    });
  });
});
