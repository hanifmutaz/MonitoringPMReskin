// src/services/dashboardService.cache.test.js
//
// Sebelumnya file ini kosong (0 baris) — placeholder yang gak pernah
// diisi. Diisi sekarang untuk nutup gap: dashboardService punya in-memory
// cache (DASHBOARD_CACHE_TTL_MS = 5000ms) yang belum pernah divalidasi
// otomatis. Test ini fokus KHUSUS ke perilaku cache-nya (getCachedPartMetrics
// / getCachedLineStatuses lewat getCached()), terpisah dari test business
// logic aggregation di dashboardService.test.js.

const { test, describe, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const pmPartService = require('./pmPartService');
const pmLineService = require('./pmLineService');
const dashboardQueries = require('../sql/dashboardQueries');
const pmPartHistoryService = require('./pmPartHistoryService');
const pmLineHistoryService = require('./pmLineHistoryService');

const dashboardService = require('./dashboardService');

function stubAggregationDeps() {
  mock.method(dashboardQueries, 'countAllParts', async () => 0);
  mock.method(dashboardQueries, 'countActiveLines', async () => 0);
  mock.method(pmPartHistoryService, 'getKetepatanSummary', async () => ({ percentage: 0, total: 0 }));
  mock.method(pmLineHistoryService, 'getKetepatanSummary', async () => ({
    monthly: { percentage: 0, total: 0 },
    weekly: { percentage: 0, total: 0 },
  }));
}

// `cache` di dashboardService.js adalah module-level singleton (persist
// antar test dalam file yang sama, karena require() di-cache Node - tidak
// ada fungsi reset yang di-export). mock.timers.enable() SELALU mulai dari
// Date.now() real setiap dipanggil ulang, jadi "lompat 10 hari" yang sama
// tiap beforeEach TIDAK cukup - entry cache dari test sebelumnya (yang juga
// sudah di-lompat 10 hari) bisa masih dianggap valid. Solusinya: offset
// lompatan waktu yang terus MENINGKAT tiap test (10 hari, 20 hari, dst),
// supaya fake "now" tiap test dijamin lebih jauh ke depan dari expiresAt
// manapun yang sempat ke-cache di test-test sebelumnya.
let cacheBustOffsetMs = 0;

describe('dashboardService - in-memory cache (TTL 5000ms)', () => {
  beforeEach(() => {
    mock.restoreAll();
    mock.timers.enable({ apis: ['Date'] });
    cacheBustOffsetMs += 10 * 24 * 60 * 60 * 1000;
    mock.timers.tick(cacheBustOffsetMs);
    stubAggregationDeps();
  });

  afterEach(() => {
    mock.timers.reset();
  });

  test('dua panggilan getSummary berdekatan HANYA query getAllComputedMetrics 1x (cache hit dalam TTL)', async () => {
    const partMetricsMock = mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
    mock.method(pmLineService, 'getPmLineStatus', async () => []);

    await dashboardService.getSummary();
    await dashboardService.getSummary();

    assert.equal(partMetricsMock.mock.callCount(), 1, 'panggilan kedua harus pakai cache, bukan query ulang');
  });

  test('setelah TTL (5000ms) lewat, panggilan berikutnya query ULANG (bukan cache basi)', async () => {
    const partMetricsMock = mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
    mock.method(pmLineService, 'getPmLineStatus', async () => []);

    await dashboardService.getSummary();
    mock.timers.tick(5001);
    await dashboardService.getSummary();

    assert.equal(partMetricsMock.mock.callCount(), 2, 'cache harus expired setelah TTL, query ke-2 harus jalan lagi');
  });

  test('kalau computeFn reject, entry cache dibuang (bukan nge-cache error) supaya request berikutnya retry, bukan stuck error', async () => {
    let callCount = 0;
    mock.method(pmPartService, 'getAllComputedMetrics', async () => {
      callCount += 1;
      if (callCount === 1) throw new Error('DB down sesaat');
      return [];
    });
    mock.method(pmLineService, 'getPmLineStatus', async () => []);

    await assert.rejects(() => dashboardService.getSummary());
    // Masih dalam window TTL yang sama (belum tick waktu), tapi cache
    // entry gagal tadi harus sudah dibuang (lihat promise.catch(() =>
    // cache.delete(key)) di getCached()) supaya panggilan ini BERHASIL,
    // bukan ikut reject dari cache basi.
    const result = await dashboardService.getSummary();
    assert.ok(result);
    assert.equal(callCount, 2, 'harus retry, bukan pakai promise gagal yang di-cache');
  });

  test('getAttention dan getSummary yang dipanggil berdekatan SHARE cache part metrics yang sama (key "partMetrics" global, bukan per-fungsi)', async () => {
    const partMetricsMock = mock.method(pmPartService, 'getAllComputedMetrics', async () => []);
    mock.method(pmLineService, 'getPmLineStatus', async () => []);
    mock.method(require('./settingsService'), 'getSetting', async () => 10);

    await dashboardService.getSummary();
    await dashboardService.getAttention();

    assert.equal(partMetricsMock.mock.callCount(), 1, 'getSummary & getAttention harus reuse cache yang sama, bukan query 2x terpisah');
  });
});
