// src/middlewares/denyDisplayRole.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const denyDisplayRole = require('./denyDisplayRole');

function run(user) {
  let nextCalled = false;
  let error = null;
  try {
    denyDisplayRole({ user }, {}, () => {
      nextCalled = true;
    });
  } catch (err) {
    error = err;
  }
  return { nextCalled, error };
}

test('role Display ditolak 403', () => {
  const { nextCalled, error } = run({ role: 'Display' });
  assert.equal(nextCalled, false);
  assert.equal(error.statusCode, 403);
});

test('role lain (Admin, Operator) lolos', () => {
  assert.equal(run({ role: 'Admin' }).nextCalled, true);
  assert.equal(run({ role: 'Operator' }).nextCalled, true);
});

test('tanpa user -> 401', () => {
  assert.equal(run(undefined).error.statusCode, 401);
});
