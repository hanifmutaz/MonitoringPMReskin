// src/services/pmPartService.test.js
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const { computeMetrics } = require('./pmPartService');

const THRESHOLDS = { danger: 2, warning: 6 }; // sama dengan default seed app_settings

// WAJIB pakai Asia/Jakarta - dateUtils.js (dipakai computeMetrics) selalu
// hitung "hari ini" dalam WIB, bukan UTC/local sandbox (Timezone Rule §30).
function daysAgo(n) {
  return dayjs().tz('Asia/Jakarta').subtract(n, 'day').format('YYYY-MM-DD');
}

describe('pmPartService.computeMetrics - Counter & Status Threshold PM Part', () => {
  test('status OK ketika sisa shot masih jauh di atas threshold warning', () => {
    // target 1.000.000, counter 100.000, pasang 100 hari lalu -> usage/day = 1000
    // sisa = 900.000, warning threshold = 6*1000=6000, sisa >> threshold -> OK
    const result = computeMetrics(
      { part_id: 1, line_id: 1, line_name: 'L1', drawing_no: 'D1', part_name: 'P1', target_shot: 1000000, counter: 100000, last_tgl_ganti: daysAgo(100) },
      THRESHOLDS
    );
    assert.equal(result.status, 'OK');
    assert.equal(result.remaining_shot, 900000);
    assert.equal(result.usage_per_day, 1000);
  });

  test('status WARNING ketika sisa shot di bawah warning_multiplier * usage_per_day', () => {
    // usage/day = 1000, warning threshold = 6000, danger threshold = 2000
    // sisa = 5000 -> di bawah 6000 tapi di atas 2000 -> WARNING
    const result = computeMetrics(
      { part_id: 1, line_id: 1, line_name: 'L1', drawing_no: 'D1', part_name: 'P1', target_shot: 105000, counter: 100000, last_tgl_ganti: daysAgo(100) },
      THRESHOLDS
    );
    assert.equal(result.status, 'WARNING');
  });

  test('status DANGER ketika sisa shot <= danger_multiplier * usage_per_day', () => {
    // usage/day = 1000, danger threshold = 2000, sisa = 1500 -> DANGER
    const result = computeMetrics(
      { part_id: 1, line_id: 1, line_name: 'L1', drawing_no: 'D1', part_name: 'P1', target_shot: 101500, counter: 100000, last_tgl_ganti: daysAgo(100) },
      THRESHOLDS
    );
    assert.equal(result.status, 'DANGER');
  });

  test('counter cross-CL sudah dijumlahkan sebelum masuk sini (SQL layer) - service tinggal pakai apa adanya', () => {
    // Simulasi: counter 300000 adalah SUM dari 3 CL No berbeda (100000 x 3)
    // yang share drawing_no yang sama. computeMetrics tidak tahu itu berasal
    // dari berapa CL - itu tanggung jawab query SQL (pmPartQueries), tapi
    // begitu sampai sini nilainya harus dipakai utuh, bukan dibagi ulang.
    const result = computeMetrics(
      { part_id: 1, line_id: 1, line_name: 'L1', drawing_no: 'D1', part_name: 'P1', target_shot: 1000000, counter: 300000, last_tgl_ganti: daysAgo(100) },
      THRESHOLDS
    );
    assert.equal(result.counter, 300000);
  });

  test('part belum pernah dipasang (last_tgl_ganti null) -> counter dianggap 0, tidak divide-by-zero', () => {
    const result = computeMetrics(
      { part_id: 1, line_id: 1, line_name: 'L1', drawing_no: 'D1', part_name: 'P1', target_shot: 100000, counter: 0, last_tgl_ganti: null },
      THRESHOLDS
    );
    assert.equal(result.usage_per_day, 0);
    assert.equal(result.status, 'OK');
    assert.equal(result.estimated_pm_date, null);
  });

  test('part overdue (counter >= target_shot) tanpa data usage terkini tetap DANGER, tidak "tersembunyi" jadi OK', () => {
    const result = computeMetrics(
      { part_id: 1, line_id: 1, line_name: 'L1', drawing_no: 'D1', part_name: 'P1', target_shot: 100000, counter: 100000, last_tgl_ganti: null },
      THRESHOLDS
    );
    assert.equal(result.remaining_shot, 0);
    assert.equal(result.status, 'DANGER');
  });

  test('wear_percentage dihitung counter/target_shot*100, dibulatkan', () => {
    const result = computeMetrics(
      { part_id: 1, line_id: 1, line_name: 'L1', drawing_no: 'D1', part_name: 'P1', target_shot: 700000, counter: 695880, last_tgl_ganti: daysAgo(50) },
      THRESHOLDS
    );
    assert.equal(result.wear_percentage, 99); // 695880/700000*100 = 99.4 -> 99
  });
});
