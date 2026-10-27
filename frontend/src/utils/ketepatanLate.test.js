import { describe, expect, test } from 'vitest';
import { alasanLabel, lateLabel, pctLabel, belowTargetTone } from './ketepatanLate';

describe('lateLabel', () => {
  test('Monthly/Weekly: hari, format id-ID', () => {
    expect(lateLabel({ unit: 'hari', value: 2.5 })).toBe('Telat 2,5 hari');
    expect(lateLabel({ unit: 'hari', value: 3 })).toBe('Telat 3 hari');
  });

  test('0 hari (hanya lewat cap tipis) tidak ditulis "Telat 0 hari"', () => {
    expect(lateLabel({ unit: 'hari', value: 0 })).toBe('Telat kurang dari 1 hari');
  });

  test('Part: shot + persen di atas target', () => {
    expect(lateLabel({ unit: 'shot', value: 5000, percent: 5 })).toBe('Telat 5.000 shot (5% di atas target)');
    expect(lateLabel({ unit: 'shot', value: 120, percent: null })).toBe('Telat 120 shot');
  });

  test('data lama tanpa lama telat -> jujur "tidak tercatat", bukan 0', () => {
    expect(lateLabel(null)).toBe('Lama telat tidak tercatat');
    expect(lateLabel(undefined)).toBe('Lama telat tidak tercatat');
  });
});

describe('alasanLabel / pctLabel / belowTargetTone', () => {
  test('alasan kosong / spasi -> keterangan data lama', () => {
    expect(alasanLabel('  Line running terus ')).toBe('Line running terus');
    expect(alasanLabel('')).toBe('Tidak ada alasan (data sebelum fitur ini)');
    expect(alasanLabel(null)).toBe('Tidak ada alasan (data sebelum fitur ini)');
  });

  test('persen format id-ID, null jadi "-"', () => {
    expect(pctLabel(94.4)).toBe('94,4%');
    expect(pctLabel(0)).toBe('0%');
    expect(pctLabel(null)).toBe('-');
  });

  test('tone: < 50 danger, selain itu warn', () => {
    expect(belowTargetTone(49.9)).toBe('danger');
    expect(belowTargetTone(50)).toBe('warn');
  });
});
