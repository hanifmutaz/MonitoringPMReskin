// node --test src/utils/urlFilters.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFilters, buildSearchParams, toStoredFilters, isDateString } from './urlFilters.js';

const defaults = { q: '', sm: 'all', sw: 'all' };
const validators = { sm: (v) => ['all', 'OK', 'DANGER'].includes(v), sw: (v) => ['all', 'OK', 'DANGER'].includes(v) };
const P = (s) => new URLSearchParams(s);

describe('resolveFilters', () => {
  test('URL menang atas storage', () => {
    const r = resolveFilters({ defaults, validators, urlParams: P('sm=DANGER'), stored: { sm: 'OK', q: 'abc' } });
    assert.deepEqual(r, { q: '', sm: 'DANGER', sw: 'all' }); // q storage TIDAK ikut kalau URL punya filter
  });
  test('tanpa filter di URL -> pakai storage', () => {
    const r = resolveFilters({ defaults, validators, urlParams: P(''), stored: { sm: 'OK', q: 'abc' } });
    assert.deepEqual(r, { q: 'abc', sm: 'OK', sw: 'all' });
  });
  test('tidak ada apa-apa -> default', () => {
    assert.deepEqual(resolveFilters({ defaults, validators, urlParams: P(''), stored: null }), defaults);
  });
  test('param lain di URL (bukan filter) tidak menghalangi restore storage', () => {
    const r = resolveFilters({ defaults, validators, urlParams: P('foo=1'), stored: { sm: 'OK' } });
    assert.equal(r.sm, 'OK');
  });
  test('nilai tidak valid jatuh ke default', () => {
    const r = resolveFilters({ defaults, validators, urlParams: P('sm=ngawur&q=ok'), stored: null });
    assert.deepEqual(r, { q: 'ok', sm: 'all', sw: 'all' });
  });
});

describe('buildSearchParams', () => {
  test('nilai default dihapus, non-default ditulis, param lain dipertahankan', () => {
    const next = buildSearchParams(P('foo=1&sm=OK'), { q: 'x', sm: 'all', sw: 'DANGER' }, defaults);
    assert.equal(next.get('foo'), '1');
    assert.equal(next.has('sm'), false);
    assert.equal(next.get('q'), 'x');
    assert.equal(next.get('sw'), 'DANGER');
  });
  test('semua default -> query bersih', () => {
    assert.equal(buildSearchParams(P('sm=OK&q=a'), defaults, defaults).toString(), '');
  });
});

describe('toStoredFilters', () => {
  test('hanya non-default; semua default -> null', () => {
    assert.deepEqual(toStoredFilters({ q: '', sm: 'OK', sw: 'all' }, defaults), { sm: 'OK' });
    assert.equal(toStoredFilters(defaults, defaults), null);
  });
});

describe('isDateString', () => {
  test('ketat', () => {
    assert.equal(isDateString('2026-10-04'), true);
    for (const v of ['2026-02-30', '2026-1-1', 'abc', '']) assert.equal(isDateString(v), false, v);
  });
});
