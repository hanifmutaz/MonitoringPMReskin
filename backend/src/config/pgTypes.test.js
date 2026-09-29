// Regression: DATE dari Postgres tidak boleh geser hari di zona waktu proses apa pun.
const test = require('node:test');
const assert = require('node:assert/strict');

require('./pgTypes');
const { types } = require('pg');
const dateUtils = require('../utils/dateUtils');

test('DATE tetap string YYYY-MM-DD, bukan objek Date', () => {
  const parse = types.getTypeParser(1082, 'text');
  assert.equal(parse('2026-07-07'), '2026-07-07');
});

test('dateUtils.formatDate tidak geser 1 hari', () => {
  const parse = types.getTypeParser(1082, 'text');
  assert.equal(dateUtils.formatDate(parse('2026-07-07')), '2026-07-07');
});
