// src/utils/jwt.display.test.js
// Role 'Display' (akun monitor/TV) dapat sesi lebih panjang dari role lain.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-test-secret-test-secret-1234';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
process.env.JWT_EXPIRES_IN = '8h';
process.env.JWT_EXPIRES_IN_DISPLAY = '30d';

const jwt = require('jsonwebtoken');
const { signToken, expiresInFor, DISPLAY_ROLE } = require('./jwt');

function lifetime(token) {
  const { exp, iat } = jwt.decode(token);
  return exp - iat;
}

test('role Display dapat expiry panjang', () => {
  assert.equal(expiresInFor(DISPLAY_ROLE), '30d');
  const token = signToken({ id: 1, username: 'tv', role: DISPLAY_ROLE });
  assert.equal(lifetime(token), 30 * 24 * 3600);
});

test('role lain tetap pakai expiry default', () => {
  const token = signToken({ id: 2, username: 'op', role: 'Operator' });
  assert.equal(lifetime(token), 8 * 3600);
});
