import { describe, expect, test } from 'vitest';
import {
  CLEANING_SOON_DAYS, cleaningInfo, cleaningUpcomingRow, idleRow, ketepatanRow, pickPriorityRows, splitIdleByCleaning,
} from './tvPriority';

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

  test('reservePerKind=1: panel sempit (5 slot) tetap menyisakan 3 slot untuk PM/Part', () => {
    const { shown } = pickPriorityRows({ core: make('pm', 10), idle: make('idle', 5), ketepatan: make('ketepatan', 5), slots: 5, reservePerKind: 1 });
    expect(shown).toHaveLength(5);
    expect(kinds(shown).filter((k) => k === 'pm')).toHaveLength(3);
    expect(kinds(shown).filter((k) => k === 'idle')).toHaveLength(1);
    expect(kinds(shown).filter((k) => k === 'ketepatan')).toHaveLength(1);
  });
});

describe('splitIdleByCleaning', () => {
  const it = (line_id, days, required, idle_days = 10) => ({ line_id, line_name: `L${line_id}`, days_to_cleaning: days, cleaning_required: required, idle_days });

  test('cleaning jatuh tempo (hari ini/telat) -> priority; sisanya -> upcoming', () => {
    const { priority, upcoming } = splitIdleByCleaning([it(1, 8, false), it(2, 0, true), it(3, -9, true), it(4, 14, false)]);
    expect(priority.map((i) => i.line_id)).toEqual([2, 3]);
    expect(upcoming.map((i) => i.line_id)).toEqual([1, 4]);
  });

  test('upcoming urut sisa hari terdekat; sisa sama -> yang lebih lama idle dulu; tanpa tanggal paling bawah', () => {
    const { upcoming } = splitIdleByCleaning([it(1, 14, false), it(2, null, false), it(3, 5, false, 20), it(4, 5, false, 30)]);
    expect(upcoming.map((i) => i.line_id)).toEqual([4, 3, 1, 2]);
  });

  test('input kosong / undefined aman', () => {
    expect(splitIdleByCleaning()).toEqual({ priority: [], upcoming: [] });
  });
});

describe('cleaningUpcomingRow', () => {
  test('sisa hari dan tone: <= CLEANING_SOON_DAYS warn, selain itu muted', () => {
    expect(cleaningUpcomingRow({ line_id: 1, line_name: '41HR65', idle_days: 53, days_to_cleaning: 8 })).toMatchObject({ key: 'c-1', line: '41HR65', idle: '53 hari', sisa: '8 hari', tone: 'muted' });
    expect(cleaningUpcomingRow({ line_id: 2, line_name: 'x', idle_days: 5, days_to_cleaning: CLEANING_SOON_DAYS }).tone).toBe('warn');
  });

  test('belum pernah running & tanpa tanggal cleaning', () => {
    expect(cleaningUpcomingRow({ line_id: 3, line_name: 'y', idle_days: 9, never_ran: true, days_to_cleaning: null })).toMatchObject({ idle: 'Belum pernah (9 hr)', sisa: '-', tone: 'muted' });
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
