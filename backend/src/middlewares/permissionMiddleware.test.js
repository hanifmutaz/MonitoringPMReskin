// src/middlewares/permissionMiddleware.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const requirePermission = require('./permissionMiddleware');
const { REFERENCE_DATA_READ } = require('./permissionGroups');

function run(mw, user) {
  let nextCalled = false;
  let error = null;
  try {
    mw({ user }, {}, () => {
      nextCalled = true;
    });
  } catch (err) {
    error = err;
  }
  return { nextCalled, error };
}

test('requirePermission: Admin ("*") selalu lolos', () => {
  const { nextCalled } = run(requirePermission('masterdata.delete'), { permissions: ['*'] });
  assert.equal(nextCalled, true);
});

test('requirePermission: role tanpa permission ditolak 403', () => {
  const { nextCalled, error } = run(requirePermission('masterdata.delete'), { permissions: ['masterdata.edit'] });
  assert.equal(nextCalled, false);
  assert.equal(error.statusCode, 403);
});

test('requirePermission.any: lolos kalau punya salah satu', () => {
  const mw = requirePermission.any('inventory.input', 'inventory.manage');
  assert.equal(run(mw, { permissions: ['inventory.input'] }).nextCalled, true);
  assert.equal(run(mw, { permissions: ['inventory.manage'] }).nextCalled, true);
});

test('requirePermission.any: inventory.input TIDAK cukup untuk edit/hapus (inventory.manage)', () => {
  const { nextCalled, error } = run(requirePermission('inventory.manage'), { permissions: ['inventory.input'] });
  assert.equal(nextCalled, false);
  assert.equal(error.statusCode, 403);
});

test('requirePermission.any: tanpa permission apa pun ditolak', () => {
  const { nextCalled, error } = run(requirePermission.any('inventory.input', 'inventory.manage'), { permissions: [] });
  assert.equal(nextCalled, false);
  assert.equal(error.statusCode, 403);
});

test('REFERENCE_DATA_READ: role dashboard-only (tanpa permission) ditolak, penginput PM lolos', () => {
  const mw = requirePermission.any(...REFERENCE_DATA_READ);
  assert.equal(run(mw, { permissions: [] }).error.statusCode, 403);
  assert.equal(run(mw, { permissions: ['dashboard.multi_site'] }).error.statusCode, 403);
  assert.equal(run(mw, { permissions: ['pm_part.submit'] }).nextCalled, true);
  assert.equal(run(mw, { permissions: ['pm_line.submit'] }).nextCalled, true);
});

test('requirePermission: tanpa req.user -> 401', () => {
  const { error } = run(requirePermission('x'), undefined);
  assert.equal(error.statusCode, 401);
});
