import { describe, expect, test } from 'vitest';
import { cleaningInfo, idleRow, ketepatanRow, pickPriorityRows } from './tvPriority';

const make = (kind, n) => Array.from({ length: n }, (_, i) => ({ key: `${kind}-${i}`, kind }));
const kinds = (rows) => rows.map((r) => r.kind);

describe('pickPriorityRows', () => {
  test('semua muat: tampil semua, urutan core -> idle -> ketepatan, tidak ada yang tersembunyi', () => {
    const { shown, hidden } = pickPriorityRows({ core: make('pm', 4), idle: make('idle', 2), ketepatan: make('ketepatan', 1), slots: 9 });
    expect(shown).toHaveLength(7);
    expect(hidden).toBe(0);
    expect(kinds(shown)).toEqual(['pm', 'pm', 'pm', 'pm', 'idle', 'idle', 'ketepatan']);
  });

  test('core panjang tidak menghabiskan slot: idle & ketepatan dijamin masing-masing 2', () => {
    const { shown, hidden } = pickPriorityRows({ core: make('pm', 20), idle: make('idle', 5), ketepatan: make('ketepatan', 5), slots: 9 });
    expect(shown).toHaveLength(9);
    expect(kinds(shown).filter((k) => k === 'pm')).toHaveLength(5);
    expect(kinds(shown).filter((k) => k === 'idle')).toHaveLength(2);
    expect(kinds(shown).filter((k) => k === 'ketepatan')).toHaveLength(2);
    expect(hidden).toBe(30 - 9);
  });

  test('slot sisa dibagi bergantian antara idle dan ketepatan', () => {
    const { shown } = pickPriorityRows({ core: make('pm', 2), idle: make('idle', 10), ketepatan: make('ketepatan', 10), slots: 9 });
    expect(shown).toHaveLength(9);
    expect(kinds(shown).filter((k) => k === 'idle')).toHaveLength(4);
    expect(kinds(shown).filter((k) => k === 'ketepatan')).toHaveLength(3);
  });

  test('tanpa idle: slot cadangan idle dipakai core/ketepatan', () => {
    const { shown } = pickPriorityRows({ core: make('pm', 20), idle: [], ketepatan: make('ketepatan', 5), slots: 9 });
    expect(kinds(shown).filter((k) => k === 'pm')).toHaveLength(7);
    expect(kinds(shown).filter((k) => k === 'ketepatan')).toHaveLength(2);
  });

  test('semua kosong', () => {
    expect(pickPriorityRows({ slots: 9 })).toEqual({ shown: [], hidden: 0 });
  });
});

describe('cleaningInfo / idleRow / ketepatanRow', () => {
  test('cleaning jatuh tempo: telat N hari / hari ini, tone danger', () => {
    expect(cleaningInfo({ cleaning_required: true, days_to_cleaning: -3 })).toEqual({ text: 'Cleaning telat 3 hari', tone: 'danger' });
    expect(cleaningInfo({ cleaning_required: true, days_to_cleaning: 0 })).toEqual({ text: 'Wajib cleaning hari ini', tone: 'danger' });
  });

  test('cleaning belum jatuh tempo: muted', () => {
    expect(cleaningInfo({ cleaning_required: false, days_to_cleaning: 12 })).toEqual({ text: 'Cleaning 12 hari lagi', tone: 'muted' });
  });

  test('idleRow: Line belum pernah running diberi label sendiri', () => {
    const row = idleRow({ line_id: 4, line_name: '41HR4', idle_days: 9, never_ran: true, cleaning_required: false, days_to_cleaning: 50 });
    expect(row).toMatchObject({ key: 'i-4', kind: 'idle', title: '41HR4', tone: 'muted' });
    expect(row.sub).toBe('Belum pernah running (9 hari)');
  });

  test('ketepatanRow: persen format id-ID, tone danger < 50 selain itu warn', () => {
    const a = ketepatanRow({ line_id: 1, line_name: '41HR1', worst_percentage: 94.4, worst_label: 'PM Weekly' }, 'bulan ini');
    expect(a).toMatchObject({ key: 'k-1', kind: 'ketepatan', tone: 'warn' });
    expect(a.info).toBe('94,4%');
    expect(a.sub).toBe('Ketepatan PM Weekly (bulan ini)');
    expect(ketepatanRow({ line_id: 2, line_name: 'x', worst_percentage: 40, worst_label: 'PM Part' }, 'bulan ini').tone).toBe('danger');
  });
});
