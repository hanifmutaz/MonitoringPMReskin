// src/utils/ketepatanDashboard.test.js
import { describe, test, expect } from 'vitest';
import {
  monthLabel,
  shiftMonth,
  clampMonth,
  isMonthKey,
  formatPct,
  pctTone,
  pctCaption,
  buildChartSeries,
  niceDomain,
  linePath,
  spreadLabels,
  viewFromLocal,
  viewFromRemote,
  belowTargetRows,
} from './ketepatanDashboard';

describe('bulan', () => {
  test('monthLabel: long / short / name, input rusak dikembalikan apa adanya', () => {
    expect(monthLabel('2026-11')).toBe('November 2026');
    expect(monthLabel('2026-08', 'short')).toBe('Agt 2026');
    expect(monthLabel('2026-05', 'name')).toBe('Mei');
    expect(monthLabel('xx')).toBe('xx');
    expect(monthLabel('2026-13')).toBe('2026-13');
  });

  test('shiftMonth lintas tahun, clampMonth tidak boleh melewati bulan sekarang', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-11', -12)).toBe('2025-11');
    expect(clampMonth('2026-12', '2026-11')).toBe('2026-11');
    expect(clampMonth('2026-03', '2026-11')).toBe('2026-03');
  });

  test('isMonthKey', () => {
    expect(isMonthKey('2026-11')).toBe(true);
    expect(isMonthKey('2026-1')).toBe(false);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey(null)).toBe(false);
  });
});

describe('format persen', () => {
  test('null/undefined = em dash (bukan 0% / 100%), desimal pakai titik (konvensi dashboard + useCountUp)', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(undefined)).toBe('—');
    expect(formatPct(100)).toBe('100%');
    expect(formatPct(97.9)).toBe('97.9%');
    expect(formatPct(94.44)).toBe('94.4%');
    expect(formatPct(0)).toBe('0%');
  });

  test('pctTone', () => {
    expect(pctTone(null)).toBe('muted');
    expect(pctTone(100)).toBe('accent');
    expect(pctTone(90)).toBe('accent');
    expect(pctTone(89.9)).toBe('warn');
    expect(pctTone(50)).toBe('warn');
    expect(pctTone(49)).toBe('danger');
  });

  test('pctCaption: di luar periode, belum ada event, dan normal', () => {
    expect(pctCaption({ percentage: 100, total: 3 }, 'Input sebelum poin lewat cap')).toBe('Input sebelum poin lewat cap, dari 3 event');
    expect(pctCaption({ percentage: null, total: 0 }, 'x')).toMatch(/Belum ada event/);
    expect(pctCaption({ percentage: 100, total: 3 }, 'x', { beforeStart: true })).toMatch(/Di luar periode hitung/);
  });
});

describe('chart', () => {
  const byMonth = [
    { month: '2026-01', future: false, part: { total: 4, percentage: 75 }, monthly: { total: 0, percentage: null }, weekly: { total: 10, percentage: 100 } },
    { month: '2026-02', future: false, part: { total: 0, percentage: null }, monthly: { total: 2, percentage: 100 }, weekly: { total: 5, percentage: 80 } },
    { month: '2026-03', future: true, part: { total: 0, percentage: null }, monthly: { total: 0, percentage: null }, weekly: { total: 0, percentage: null } },
  ];

  test('buildChartSeries: urutan seri tetap, bulan tanpa event atau masa depan = null', () => {
    const series = buildChartSeries(byMonth);
    expect(series.map((s) => s.key)).toEqual(['part', 'monthly', 'weekly']);
    expect(series[0].values).toEqual([75, null, null]);
    expect(series[1].values).toEqual([null, 100, null]);
    expect(series[2].values).toEqual([100, 80, null]);
  });

  test('buildChartSeries: input kosong tidak error', () => {
    expect(buildChartSeries(undefined).every((s) => s.values.length === 0)).toBe(true);
  });

  test('niceDomain: selalu berakhir 100, ticks rapi', () => {
    expect(niceDomain([])).toEqual({ min: 0, max: 100, ticks: [0, 50, 100] });
    expect(niceDomain([null, null])).toEqual({ min: 0, max: 100, ticks: [0, 50, 100] });
    expect(niceDomain([100, 100])).toEqual({ min: 90, max: 100, ticks: [90, 95, 100] });
    expect(niceDomain([95.5, 100])).toEqual({ min: 90, max: 100, ticks: [90, 95, 100] });
    expect(niceDomain([82, 100])).toEqual({ min: 70, max: 100, ticks: [70, 80, 90, 100] });
    expect(niceDomain([45, 100])).toEqual({ min: 40, max: 100, ticks: [40, 60, 80, 100] });
    expect(niceDomain([0, 100])).toEqual({ min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] });
  });

  test('niceDomain: nilai terendah selalu ada di dalam domain', () => {
    for (const lo of [0, 12, 33.3, 49, 50, 64.9, 79, 89.9, 94, 99.9, 100]) {
      const d = niceDomain([lo, 100]);
      expect(d.min).toBeLessThanOrEqual(lo);
      expect(d.ticks[0]).toBe(d.min);
      expect(d.ticks[d.ticks.length - 1]).toBe(100);
    }
  });

  test('linePath: null memutus garis (segmen baru), tanpa titik = string kosong', () => {
    const x = (i) => i * 10;
    const y = (v) => 100 - v;
    expect(linePath([100, 90, null, 80, 70], x, y)).toBe('M0 0 L10 10 M30 20 L40 30');
    expect(linePath([null, 50, null], x, y)).toBe('M10 50');
    expect(linePath([null, null], x, y)).toBe('');
    expect(linePath([], x, y)).toBe('');
  });
});

describe('spreadLabels', () => {
  test('tiga label di y sama disebar dengan jarak minimum, urutan indeks dipertahankan', () => {
    const out = spreadLabels([50, 50, 50], 14);
    expect(out).toEqual([50, 64, 78]);
  });

  test('label yang sudah berjauhan tidak digeser; null tetap null', () => {
    expect(spreadLabels([10, null, 100], 14)).toEqual([10, null, 100]);
  });

  test('dijepit ke batas bawah (hi): dorong label ke atas, bukan keluar area', () => {
    const out = spreadLabels([90, 90, 90], 14, 0, 100);
    expect(Math.max(...out)).toBe(100);
    expect(out[2] - out[1]).toBeGreaterThanOrEqual(14);
    expect(out[1] - out[0]).toBeGreaterThanOrEqual(14);
  });

  test('dijepit ke batas atas (lo)', () => {
    const out = spreadLabels([-5, 0], 14, 0, 100);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(14);
  });

  test('kosong / semua null tidak error', () => {
    expect(spreadLabels([], 14)).toEqual([]);
    expect(spreadLabels([null, null], 14)).toEqual([null, null]);
  });
});

describe('adapter', () => {
  const local = {
    month: '2026-10',
    year: 2026,
    is_current: false,
    current_month: '2026-11',
    bulan: { before_start: false, part: { total: 2, on_time_count: 2, percentage: 100 }, monthly: { total: 4, on_time_count: 4, percentage: 100 }, weekly: { total: 44, on_time_count: 42, percentage: 95.5 } },
    tahun: { before_start: false, part: { total: 4, on_time_count: 4, percentage: 100 }, monthly: null, weekly: { total: 95, on_time_count: 93, percentage: 97.9 } },
    by_month: [],
    trend: [{ month: '2026-10', part: null, monthly: { total: 4, percentage: 100 }, weekly: { total: 44, percentage: 95.5 } }],
    below_target: { bulan: [{ line_id: 1 }], tahun: [] },
  };

  test('viewFromLocal: sel yang null dinormalkan ke sel kosong, bukan crash', () => {
    const v = viewFromLocal(local);
    expect(v.source).toBe('local');
    expect(v.isCurrent).toBe(false);
    expect(v.tahun.monthly).toEqual({ percentage: null, total: 0, on_time_count: 0 });
    expect(v.trend[0].part).toEqual({ percentage: null, total: 0, on_time_count: 0 });
    expect(v.belowTarget.bulan).toHaveLength(1);
  });

  test('viewFromRemote: tanpa backdate/chart/PM Part per bulan; null kalau summary belum ada', () => {
    expect(viewFromRemote(null)).toBeNull();
    const v = viewFromRemote(
      {
        ketepatan_bulan_ini: { month: '2026-11', monthly: { percentage: 100, total: 3 }, weekly: { percentage: 100, total: 9 } },
        ketepatan_pm_part_percentage: 100, ketepatan_pm_part_total: 4,
        ketepatan_pm_monthly_percentage: 100, ketepatan_pm_monthly_total: 50,
        ketepatan_pm_weekly_percentage: 97.9, ketepatan_pm_weekly_total: 95,
        ketepatan_trend: [{ month: '2026-11', monthly: { percentage: 100, total: 3 }, weekly: { percentage: 100, total: 9 } }],
      },
      [{ line_id: 1, worst_percentage: 90 }]
    );
    expect(v.source).toBe('remote');
    expect(v.byMonth).toBeNull();
    expect(v.bulan.part).toBeNull();
    expect(v.tahun.weekly.percentage).toBe(97.9);
    expect(v.trend[0].part).toBeNull();
    expect(v.belowTarget.bulan).toBeNull();
    expect(v.belowTarget.tahun).toHaveLength(1);
  });

  test('viewFromRemote: site lama tanpa ketepatan_bulan_ini tidak crash', () => {
    const v = viewFromRemote({ ketepatan_pm_part_percentage: null });
    expect(v.bulan).toBeNull();
    expect(v.trend).toEqual([]);
  });

  test('belowTargetRows: buang null dan >= 100', () => {
    const rows = belowTargetRows([{ worst_percentage: 80 }, { worst_percentage: 100 }, { worst_percentage: null }, {}]);
    expect(rows).toHaveLength(1);
    expect(belowTargetRows(undefined)).toEqual([]);
  });
});
