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
const lineIdleService = require('./lineIdleService');
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
  mock.method(pmPartHistoryService, 'getKetepatanMonthlyTrend', async () => new Map());
  mock.method(pmLineHistoryService, 'getKetepatanMonthlyTrend', async () => new Map());
  mock.method(settingsService, 'getSetting', async () => 10);
  // Default: tidak ada Line yang tidak running (tanpa ini getUpcoming menyentuh DB).
  mock.method(lineIdleService, 'getIdleLineNameSet', async () => new Set());
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

    test('line OVERDUE dihitung sebagai kritis (lebih parah dari DANGER) + muncul di lines_overdue', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ line_id: 1, status_monthly: 'OVERDUE', status_weekly: 'OK' }),
        line({ line_id: 2, status_monthly: 'DANGER', status_weekly: 'OVERDUE' }),
        line({ line_id: 3, status_monthly: 'OK', status_weekly: 'DANGER' }),
      ]);

      const result = await dashboardService.getSummary();

      assert.equal(result.lines_overdue, 2);
      assert.equal(result.lines_critical, 3); // Danger + Overdue
      assert.equal(result.lines_healthy, 0);
    });

    test('lines_pm_today menghitung line yang perlu PM hari ini (Monthly ATAU Weekly)', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ line_id: 1, perlu_pm_hari_ini_monthly: true }),
        line({ line_id: 2, perlu_pm_hari_ini_weekly: true }),
        line({ line_id: 3, perlu_pm_hari_ini_monthly: true, perlu_pm_hari_ini_weekly: true }),
        line({ line_id: 4 }),
      ]);

      const result = await dashboardService.getSummary();
      assert.equal(result.lines_pm_today, 3);
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
    test('Line yang TIDAK RUNNING tidak masuk jadwal (PM Part, Monthly, dan Weekly), Line lain tetap muncul', async () => {
      mock.method(lineIdleService, 'getIdleLineNameSet', async () => new Set(['CL-Mati']));
      mock.method(pmPartService, 'getAllComputedMetrics', async () => [
        part({ line_name: 'CL-Mati', part_name: 'Part Mati', estimated_pm_date: dateUtils.addDaysToToday(2) }),
        part({ line_name: 'CL-Jalan', part_name: 'Part Jalan', estimated_pm_date: dateUtils.addDaysToToday(2) }),
      ]);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ line_name: 'CL-Mati', sisa_hari_monthly: 2, sisa_hari_weekly: 1 }),
        line({ line_id: 2, line_name: 'CL-Jalan', sisa_hari_monthly: 2, sisa_hari_weekly: null }),
      ]);

      const result = await dashboardService.getUpcoming();

      assert.ok(result.every((i) => i.line_name !== 'CL-Mati'), 'Line tidak running tidak boleh ada di jadwal');
      assert.deepEqual(result.map((i) => i.type).sort(), ['PM_LINE_MONTHLY', 'PM_PART']);
    });

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

    test('sisa 0,5 hari -> estimated_date HARI INI (dibulatkan ke bawah) + flag perlu_pm_hari_ini ikut terbawa', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({
          line_name: 'CL-Half', sisa_hari_weekly: 0.5, status_weekly: 'DANGER',
          estimasi_pm_weekly: dateUtils.todayString(), perlu_pm_hari_ini_weekly: true,
        }),
      ]);

      const result = await dashboardService.getUpcoming();
      assert.equal(result[0].estimated_date, dateUtils.todayString());
      assert.equal(result[0].perlu_pm_hari_ini, true);
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
    test('ketepatan: bulan_ini & tahun_ini PM Part dipisah (period month vs year)', async () => {
      mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
      mock.method(pmPartHistoryService, 'getKetepatanSummary', async ({ period } = {}) =>
        period === 'month' ? { percentage: 80, total: 5 } : { percentage: 95, total: 40 }
      );

      const result = await dashboardService.getPartSummary();

      assert.match(result.ketepatan.month, /^\d{4}-\d{2}$/);
      assert.deepEqual(result.ketepatan.part.bulan_ini, { percentage: 80, total: 5 });
      assert.deepEqual(result.ketepatan.part.tahun_ini, { percentage: 95, total: 40 });
    });

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

    test('top_lowest_shot: maks 50 part sisa shot terkecil, status OK ikut, urut naik', async () => {
      const parts = Array.from({ length: 60 }, (_, i) => part({ part_name: `P${i}`, status: 'OK', remaining_shot: (60 - i) * 100 }));
      mock.method(pmPartService, 'getAllComputedMetrics', async () => parts);

      const result = await dashboardService.getPartSummary();

      assert.equal(result.top_attention.length, 0);
      assert.equal(result.top_lowest_shot.length, 50);
      assert.equal(result.top_lowest_shot[0].remaining_shot, 100);
      assert.equal(result.top_lowest_shot[49].remaining_shot, 5000);
    });
  });

  describe('getLineSummary', () => {
    test('ketepatan: monthly & weekly masing-masing punya bulan_ini dan tahun_ini', async () => {
      mock.method(pmLineService, 'getPmLineStatus', async () => []);
      mock.method(pmLineHistoryService, 'getKetepatanSummary', async ({ period } = {}) =>
        period === 'month'
          ? { monthly: { percentage: 100, total: 3 }, weekly: { percentage: null, total: 0 } }
          : { monthly: { percentage: 97, total: 41 }, weekly: { percentage: 90, total: 44 } }
      );

      const result = await dashboardService.getLineSummary();

      assert.deepEqual(result.ketepatan.monthly.bulan_ini, { percentage: 100, total: 3 });
      assert.deepEqual(result.ketepatan.weekly.bulan_ini, { percentage: null, total: 0 });
      assert.deepEqual(result.ketepatan.weekly.tahun_ini, { percentage: 90, total: 44 });
    });

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

    test('OVERDUE punya bucket sendiri dan attention mengurutkan OVERDUE paling atas, lalu DANGER, lalu WARNING', async () => {
      mock.method(pmLineService, 'getPmLineStatus', async () => [
        line({ line_name: 'W', status_monthly: 'WARNING', status_weekly: 'OK' }),
        line({ line_name: 'D', status_monthly: 'DANGER', status_weekly: 'OK' }),
        line({ line_name: 'O', status_monthly: 'OK', status_weekly: 'OVERDUE' }),
      ]);

      const result = await dashboardService.getLineSummary();

      assert.equal(result.weekly.OVERDUE, 1);
      assert.equal(result.monthly.OVERDUE, 0);
      assert.deepEqual(result.attention.map((l) => l.line_name), ['O', 'D', 'W']);
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

  describe('getKetepatanBelowTarget', () => {
    test('hanya Line dengan nilai terburuk < 100, terburuk dulu, tanpa batas 5', async () => {
      const partRows = Array.from({ length: 8 }, (_, i) => ({ line_id: i, line_name: `L${i}`, percentage: 99 - i }));
      partRows.push({ line_id: 50, line_name: 'Sempurna', percentage: 100 });
      mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => partRows);
      mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => [
        { line_id: 50, line_name: 'Sempurna', monthly: { percentage: 100 }, weekly: { percentage: 100 } },
      ]);

      const { items, period } = await dashboardService.getKetepatanBelowTarget();

      assert.equal(period, 'month');
      assert.equal(items.length, 8); // 'Sempurna' (100%) tidak ikut, dan tidak dipotong 5
      assert.equal(items[0].line_name, 'L7'); // 92% terburuk
      assert.ok(items.every((r) => r.worst_percentage < 100));
    });

    test('worst_label menunjukkan jenis PM yang terburuk', async () => {
      mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => [{ line_id: 1, line_name: 'CL-01', percentage: 100 }]);
      mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => [
        { line_id: 1, line_name: 'CL-01', monthly: { percentage: 100 }, weekly: { percentage: 94.4 } },
      ]);

      const { items } = await dashboardService.getKetepatanBelowTarget();

      assert.equal(items[0].worst_percentage, 94.4);
      assert.equal(items[0].worst_label, 'PM Weekly');
    });

    test('period diteruskan ke service per-Line; nilai tidak valid jatuh ke month', async () => {
      const part = mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => []);
      const lineM = mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => []);

      await dashboardService.getKetepatanBelowTarget({ period: 'year' });
      assert.deepEqual(part.mock.calls[0].arguments[0], { period: 'year' });
      assert.deepEqual(lineM.mock.calls[0].arguments[0], { period: 'year' });

      const res = await dashboardService.getKetepatanBelowTarget({ period: 'aneh' });
      assert.equal(res.period, 'month');
    });

    test('Line tanpa event (semua null) tidak muncul', async () => {
      mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => []);
      mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => [
        { line_id: 1, line_name: 'CL-01', monthly: { percentage: null }, weekly: { percentage: null } },
      ]);
      const { items } = await dashboardService.getKetepatanBelowTarget();
      assert.equal(items.length, 0);
    });
  });

  describe('ketepatan per bulan', () => {
    test('getSummary: ketepatan_bulan_ini + ketepatan_trend (6 bulan) ikut keluar', async () => {
      mock.method(pmLineHistoryService, 'getKetepatanSummary', async ({ period } = {}) =>
        period === 'month'
          ? { monthly: { percentage: 80, total: 5 }, weekly: { percentage: 100, total: 12 } }
          : { monthly: { percentage: 0, total: 0 }, weekly: { percentage: 0, total: 0 } }
      );
      mock.method(pmPartHistoryService, 'getKetepatanSummary', async ({ period } = {}) =>
        period === 'month' ? { percentage: 90, total: 10 } : { percentage: 0, total: 0 }
      );
      mock.method(pmLineHistoryService, 'getKetepatanMonthlyTrend', async () => new Map());
      mock.method(pmPartHistoryService, 'getKetepatanMonthlyTrend', async () => new Map());
      mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
      mock.method(pmLineService, 'getPmLineStatus', async () => []);

      const summary = await dashboardService.getSummary();

      assert.deepEqual(summary.ketepatan_bulan_ini.part, { percentage: 90, total: 10 });
      assert.deepEqual(summary.ketepatan_bulan_ini.monthly, { percentage: 80, total: 5 });
      assert.deepEqual(summary.ketepatan_bulan_ini.weekly, { percentage: 100, total: 12 });
      assert.match(summary.ketepatan_bulan_ini.month, /^\d{4}-\d{2}$/);
      assert.equal(summary.ketepatan_trend.length, 6);
    });

    test('getKetepatanTrend: selalu N bulan urut lama->baru, bulan tanpa event = percentage null', async () => {
      const dateUtils = require('../utils/dateUtils');
      const thisMonth = dateUtils.monthKey(0);
      mock.method(pmPartHistoryService, 'getKetepatanMonthlyTrend', async () =>
        new Map([[thisMonth, { total: 4, on_time_count: 3, percentage: 75 }]])
      );
      mock.method(pmLineHistoryService, 'getKetepatanMonthlyTrend', async () =>
        new Map([
          [thisMonth, { monthly: { total: 2, on_time_count: 2, percentage: 100 }, weekly: { total: 0, on_time_count: 0, percentage: null } }],
        ])
      );

      const trend = await dashboardService.getKetepatanTrend(6);

      assert.equal(trend.length, 6);
      assert.equal(trend[0].month, dateUtils.monthKey(-5));
      assert.equal(trend[5].month, thisMonth);
      assert.deepEqual(trend[0].part, { percentage: null, total: 0 });
      assert.deepEqual(trend[5].part, { percentage: 75, total: 4 });
      assert.deepEqual(trend[5].monthly, { percentage: 100, total: 2 });
      assert.deepEqual(trend[5].weekly, { percentage: null, total: 0 });
    });
  });

  describe('getKetepatanBelowTarget - backdate (month)', () => {
    test('month diteruskan sebagai range {from,to} dibatasi akhir periode, bukan sampai sekarang', async () => {
      const part = mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => []);
      const lineM = mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => []);

      const resMonth = await dashboardService.getKetepatanBelowTarget({ period: 'month', month: '2026-02' });
      assert.deepEqual(part.mock.calls[0].arguments[0], { period: 'month', range: { from: '2026-02-01', to: '2026-02-28' } });
      assert.deepEqual(lineM.mock.calls[0].arguments[0], { period: 'month', range: { from: '2026-02-01', to: '2026-02-28' } });
      assert.equal(resMonth.month, '2026-02');

      await dashboardService.getKetepatanBelowTarget({ period: 'year', month: '2025-08' });
      // tahun = year-to-date: berakhir di akhir bulan terpilih (Agt), bukan 31 Des
      assert.deepEqual(part.mock.calls[1].arguments[0], { period: 'year', range: { from: '2025-01-01', to: '2025-08-31' } });
    });
  });

  describe('getKetepatanDashboard (periode global, bisa backdate)', () => {
    function stubPeriodData({ partMap = new Map(), lineMap = new Map(), startDate = '' } = {}) {
      mock.timers.setTime(new Date('2026-11-07T01:00:00Z').getTime()); // 07 Nov 2026 08:00 WIB
      const partRange = mock.method(pmPartHistoryService, 'getKetepatanByMonthRange', async () => partMap);
      const lineRange = mock.method(pmLineHistoryService, 'getKetepatanByMonthRange', async () => lineMap);
      const partPerLine = mock.method(pmPartHistoryService, 'getKetepatanPerLine', async () => []);
      const linePerLine = mock.method(pmLineHistoryService, 'getKetepatanPerLine', async () => []);
      mock.method(settingsService, 'getSetting', async () => startDate);
      return { partRange, lineRange, partPerLine, linePerLine };
    }

    test('tanpa month = bulan berjalan: 12 bulan Jan-Des, hanya bulan depan yang future, tren berakhir bulan ini', async () => {
      stubPeriodData();

      const res = await dashboardService.getKetepatanDashboard();

      assert.equal(res.month, '2026-11');
      assert.equal(res.year, 2026);
      assert.equal(res.is_current, true);
      assert.equal(res.by_month.length, 12);
      assert.equal(res.by_month[0].month, '2026-01');
      assert.equal(res.by_month[11].month, '2026-12');
      assert.deepEqual(res.by_month.filter((r) => r.future).map((r) => r.month), ['2026-12']);
      assert.deepEqual(res.trend.map((r) => r.month), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    });

    test('backdate: tren 6 bulan berakhir di bulan terpilih (lintas tahun) dan rentang query dibatasi periode', async () => {
      const { partRange, lineRange, partPerLine } = stubPeriodData();

      const res = await dashboardService.getKetepatanDashboard({ month: '2026-03' });

      assert.equal(res.is_current, false);
      assert.deepEqual(res.trend.map((r) => r.month), ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']);
      const ranges = partRange.mock.calls.map((c) => c.arguments[0]);
      assert.deepEqual(ranges[0], { from: '2026-01-01', to: '2026-03-31' }); // chart/kartu tahun = Jan s/d akhir bulan terpilih
      assert.deepEqual(ranges[1], { from: '2025-10-01', to: '2026-03-31' }); // tren
      assert.deepEqual(lineRange.mock.calls.map((c) => c.arguments[0]), ranges);
      assert.deepEqual(partPerLine.mock.calls[0].arguments[0], { period: 'month', range: { from: '2026-03-01', to: '2026-03-31' } });
      assert.deepEqual(partPerLine.mock.calls[1].arguments[0], { period: 'year', range: { from: '2026-01-01', to: '2026-03-31' } });
    });

    test('kartu bulan = bulan terpilih; kartu tahun = year-to-date (Jan s/d bulan terpilih), event sesudahnya TIDAK ikut', async () => {
      const partMap = new Map([
        ['2026-01', { total: 4, on_time_count: 3, percentage: 75 }],
        ['2026-03', { total: 6, on_time_count: 6, percentage: 100 }],
      ]);
      const lineMap = new Map([
        ['2026-03', { monthly: { total: 2, on_time_count: 1, percentage: 50 }, weekly: { total: 10, on_time_count: 10, percentage: 100 } }],
        // Mei ada di data tapi SETELAH bulan terpilih (Mar): tidak boleh masuk kartu tahun maupun chart
        ['2026-05', { monthly: { total: 3, on_time_count: 3, percentage: 100 }, weekly: { total: 5, on_time_count: 4, percentage: 80 } }],
      ]);
      stubPeriodData({ partMap, lineMap });

      const res = await dashboardService.getKetepatanDashboard({ month: '2026-03' });

      assert.deepEqual(res.bulan.part, { total: 6, on_time_count: 6, percentage: 100 });
      assert.deepEqual(res.bulan.monthly, { total: 2, on_time_count: 1, percentage: 50 });
      assert.deepEqual(res.tahun.part, { total: 10, on_time_count: 9, percentage: 90 });
      assert.deepEqual(res.tahun.monthly, { total: 2, on_time_count: 1, percentage: 50 });
      assert.deepEqual(res.tahun.weekly, { total: 10, on_time_count: 10, percentage: 100 });
    });

    test('bulan sesudah bulan terpilih ditandai future dan dikosongkan di chart (Apr-Des untuk Mar), Jan-Mar tidak', async () => {
      const lineMap = new Map([
        ['2026-05', { monthly: { total: 3, on_time_count: 3, percentage: 100 }, weekly: { total: 5, on_time_count: 4, percentage: 80 } }],
      ]);
      stubPeriodData({ lineMap });

      const res = await dashboardService.getKetepatanDashboard({ month: '2026-03' });

      assert.deepEqual(res.by_month.filter((r) => !r.future).map((r) => r.month), ['2026-01', '2026-02', '2026-03']);
      assert.equal(res.by_month[4].future, true);
      assert.deepEqual(res.by_month[4].monthly, { total: 0, on_time_count: 0, percentage: null });
    });

    test('bulan tanpa event = percentage null dan total 0 (bukan 0%/100%)', async () => {
      stubPeriodData();

      const res = await dashboardService.getKetepatanDashboard({ month: '2026-02' });

      assert.deepEqual(res.bulan.part, { total: 0, on_time_count: 0, percentage: null });
      assert.deepEqual(res.tahun.weekly, { total: 0, on_time_count: 0, percentage: null });
      assert.equal(res.by_month[1].monthly.percentage, null);
    });

    test('before_start: periode seluruhnya sebelum ketepatan_start_date; start_date tidak valid = null', async () => {
      stubPeriodData({ startDate: '2026-06-15' });
      const early = await dashboardService.getKetepatanDashboard({ month: '2026-03' });
      assert.equal(early.start_date, '2026-06-15');
      assert.equal(early.bulan.before_start, true);
      assert.equal(early.tahun.before_start, true); // tahun = Jan-Mar 2026, seluruhnya sebelum 15 Jun

      mock.restoreAll();
      stubDefaults();
      stubPeriodData({ startDate: '2026-06-15' });
      const later = await dashboardService.getKetepatanDashboard({ month: '2026-08' });
      assert.equal(later.bulan.before_start, false);
      assert.equal(later.tahun.before_start, false); // Jan-Agt 2026 mencakup sesudah 15 Jun

      mock.restoreAll();
      stubDefaults();
      stubPeriodData({ startDate: 'bukan-tanggal' });
      const invalid = await dashboardService.getKetepatanDashboard({ month: '2026-03' });
      assert.equal(invalid.start_date, null);
      assert.equal(invalid.bulan.before_start, false);
    });

    test('daftar Line < 100% ikut dibawa untuk bulan DAN tahun', async () => {
      const { partPerLine } = stubPeriodData();
      partPerLine.mock.mockImplementation(async ({ period }) =>
        period === 'month'
          ? [{ line_id: 1, line_name: 'CL-01', percentage: 80 }]
          : [{ line_id: 1, line_name: 'CL-01', percentage: 90 }, { line_id: 2, line_name: 'CL-02', percentage: 95 }]
      );

      const res = await dashboardService.getKetepatanDashboard({ month: '2026-10' });

      assert.equal(res.below_target.bulan.length, 1);
      assert.equal(res.below_target.bulan[0].worst_percentage, 80);
      assert.equal(res.below_target.tahun.length, 2);
    });
  });
});
