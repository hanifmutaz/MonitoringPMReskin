const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeIdleStatus } = require('./lineIdle');

const CFG = { minDays: 7, intervalDays: 60 };
const TODAY = '2026-10-24';

describe('computeIdleStatus - Line tidak running', () => {
  test('running kemarin -> tidak idle', () => {
    const r = computeIdleStatus({ last_run_date: '2026-10-23', created_date: '2025-01-01', last_cleaning_date: null }, CFG, TODAY);
    assert.equal(r.is_idle, false);
    assert.equal(r.idle_days, 1);
    assert.equal(r.cleaning_required, false);
  });

  test('6 hari tanpa output -> belum idle (minimum 7)', () => {
    const r = computeIdleStatus({ last_run_date: '2026-10-18', created_date: '2025-01-01' }, CFG, TODAY);
    assert.equal(r.idle_days, 6);
    assert.equal(r.is_idle, false);
  });

  test('tepat 7 hari tanpa output -> idle', () => {
    const r = computeIdleStatus({ last_run_date: '2026-10-17', created_date: '2025-01-01' }, CFG, TODAY);
    assert.equal(r.idle_days, 7);
    assert.equal(r.is_idle, true);
    assert.equal(r.idle_since, '2026-10-18'); // hari pertama tidak running
  });

  test('minimum hari bisa diubah lewat setting', () => {
    const r = computeIdleStatus({ last_run_date: '2026-10-21', created_date: '2025-01-01' }, { minDays: 3, intervalDays: 60 }, TODAY);
    assert.equal(r.is_idle, true);
  });

  test('belum pernah running: dihitung dari tanggal Line dibuat', () => {
    const r = computeIdleStatus({ last_run_date: null, created_date: '2026-10-01' }, CFG, TODAY);
    assert.equal(r.never_ran, true);
    assert.equal(r.idle_days, 23);
    assert.equal(r.is_idle, true);
    assert.equal(r.idle_since, '2026-10-01');
  });
});

describe('computeIdleStatus - cleaning wajib tiap interval', () => {
  test('belum pernah cleaning: dihitung dari hari pertama tidak running', () => {
    // idle sejak 2026-08-01 -> jatuh tempo 2026-09-30 -> sudah lewat 24 hari
    const r = computeIdleStatus({ last_run_date: '2026-07-31', created_date: '2025-01-01', last_cleaning_date: null }, CFG, TODAY);
    assert.equal(r.cleaning_baseline_date, '2026-08-01');
    assert.equal(r.cleaning_due_date, '2026-09-30');
    assert.equal(r.days_to_cleaning, -24);
    assert.equal(r.cleaning_required, true);
  });

  test('cleaning terakhir jadi baseline (bukan awal idle)', () => {
    // cleaning 2026-10-10 -> jatuh tempo 2026-12-09 -> 46 hari lagi
    const r = computeIdleStatus({ last_run_date: '2026-07-31', created_date: '2025-01-01', last_cleaning_date: '2026-10-10' }, CFG, TODAY);
    assert.equal(r.cleaning_baseline_date, '2026-10-10');
    assert.equal(r.cleaning_due_date, '2026-12-09');
    assert.equal(r.days_to_cleaning, 46);
    assert.equal(r.cleaning_required, false);
  });

  test('tepat di hari jatuh tempo -> sudah wajib cleaning', () => {
    const r = computeIdleStatus({ last_run_date: '2026-07-31', created_date: '2025-01-01', last_cleaning_date: '2026-08-25' }, CFG, TODAY);
    assert.equal(r.cleaning_due_date, '2026-10-24');
    assert.equal(r.days_to_cleaning, 0);
    assert.equal(r.cleaning_required, true);
  });

  test('interval bisa diubah lewat setting', () => {
    const r = computeIdleStatus({ last_run_date: '2026-07-31', created_date: '2025-01-01', last_cleaning_date: '2026-10-10' }, { minDays: 7, intervalDays: 14 }, TODAY);
    assert.equal(r.cleaning_due_date, '2026-10-24');
    assert.equal(r.cleaning_required, true);
  });

  test('Line tidak idle -> tidak ada kewajiban cleaning', () => {
    const r = computeIdleStatus({ last_run_date: '2026-10-24', created_date: '2025-01-01', last_cleaning_date: null }, CFG, TODAY);
    assert.equal(r.cleaning_required, false);
    assert.equal(r.cleaning_due_date, null);
  });
});
