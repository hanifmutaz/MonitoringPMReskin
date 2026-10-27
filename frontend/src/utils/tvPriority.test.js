import { describe, expect, test } from 'vitest';
import {
  CLEANING_DANGER_DAYS, CLEANING_WARN_DAYS, cleaningInfo, cleaningUpcomingRow, idleRow, pickPriorityRows,
  resolveCleaningThresholds, splitIdleByCleaning,
} from './tvPriority';

const make = (kind, n) => Array.from({ length: n }, (_, i) => ({ key: `${kind}-${i}`, kind }));
const kinds = (rows) => rows.map((r) => r.kind);

describe('pickPriorityRows', () => {
  test('semua muat: tampil semua, urutan core -> idle, tidak ada yang tersembunyi', () => {
    const { shown, hidden } = pickPriorityRows({ core: make('pm', 4), idle: make('idle', 2), slots: 9 });
    expect(kinds(shown)).toEqual(['pm', 'pm', 'pm', 'pm', 'idle', 'idle']);
    expect(hidden).toBe(0);
  });

  test('core panjang tidak menghabiskan slot: idle dijamin 2', () => {
    const { shown, hidden } = pickPriorityRows({ core: make('pm', 20), idle: make('idle', 5), slots: 9 });
    expect(shown).toHaveLength(9);
    expect(kinds(shown).filter((k) => k === 'pm')).toHaveLength(7);
    expect(kinds(shown).filter((k) => k === 'idle')).toHaveLength(2);
    expect(hidden).toBe(25 - 9);
  });

  test('core pendek: sisa slot dipakai idle', () => {
    const { shown } = pickPriorityRows({ core: make('pm', 2), idle: make('idle', 10), slots: 9 });
    expect(kinds(shown).filter((k) => k === 'idle')).toHaveLength(7);
  });

  test('tanpa idle: semua slot untuk core', () => {
    const { shown } = pickPriorityRows({ core: make('pm', 20), idle: [], slots: 9 });
    expect(shown).toHaveLength(9);
  });

  test('reserveIdle bisa diubah', () => {
    const { shown } = pickPriorityRows({ core: make('pm', 20), idle: make('idle', 5), slots: 5, reserveIdle: 1 });
    expect(kinds(shown).filter((k) => k === 'pm')).toHaveLength(4);
    expect(kinds(shown).filter((k) => k === 'idle')).toHaveLength(1);
  });

  test('semua kosong', () => {
    expect(pickPriorityRows({ slots: 9 })).toEqual({ shown: [], hidden: 0 });
  });
});

describe('cleaningInfo / idleRow', () => {
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
  test('sisa hari dan tone mengikuti batas default (<= 7 danger, <= 14 warn, selebihnya muted)', () => {
    expect(cleaningUpcomingRow({ line_id: 1, line_name: '41HR65', idle_days: 53, days_to_cleaning: 17 })).toMatchObject({ key: 'c-1', line: '41HR65', idle: '53 hari', sisa: '17 hari', tone: 'muted' });
    expect(cleaningUpcomingRow({ line_id: 2, line_name: 'x', idle_days: 5, days_to_cleaning: CLEANING_WARN_DAYS }).tone).toBe('warn');
    expect(cleaningUpcomingRow({ line_id: 2, line_name: 'x', idle_days: 5, days_to_cleaning: CLEANING_DANGER_DAYS }).tone).toBe('danger');
  });

  test('batas dari Settings dipakai kalau dikirim', () => {
    const cfg = { warnDays: 30, dangerDays: 10 };
    expect(cleaningUpcomingRow({ line_id: 1, line_name: 'a', idle_days: 5, days_to_cleaning: 20 }, cfg).tone).toBe('warn');
    expect(cleaningUpcomingRow({ line_id: 1, line_name: 'a', idle_days: 5, days_to_cleaning: 10 }, cfg).tone).toBe('danger');
    expect(cleaningUpcomingRow({ line_id: 1, line_name: 'a', idle_days: 5, days_to_cleaning: 31 }, cfg).tone).toBe('muted');
  });

  test('belum pernah running & tanpa tanggal cleaning', () => {
    expect(cleaningUpcomingRow({ line_id: 3, line_name: 'y', idle_days: 9, never_ran: true, days_to_cleaning: null })).toMatchObject({ idle: 'Belum pernah (9 hr)', sisa: '-', tone: 'muted' });
  });
});

describe('resolveCleaningThresholds', () => {
  test('kosong/tidak valid -> default', () => {
    expect(resolveCleaningThresholds()).toEqual({ dangerDays: CLEANING_DANGER_DAYS, warnDays: CLEANING_WARN_DAYS });
    expect(resolveCleaningThresholds({ warnDays: 'abc', dangerDays: null })).toEqual({ dangerDays: CLEANING_DANGER_DAYS, warnDays: CLEANING_WARN_DAYS });
  });

  test('terbalik (danger > warn) ditukar', () => {
    expect(resolveCleaningThresholds({ warnDays: 5, dangerDays: 20 })).toEqual({ dangerDays: 5, warnDays: 20 });
  });

  test('nilai 0 sah (hanya yang sudah jatuh tempo hari ini yang merah)', () => {
    expect(resolveCleaningThresholds({ warnDays: 7, dangerDays: 0 })).toEqual({ dangerDays: 0, warnDays: 7 });
  });
});
