const test = require('node:test');
const assert = require('node:assert/strict');
const { createCsrfToken, verifyCsrfToken } = require('../lib/csrf.cjs');

test('CSRF token verifies with the same secret', () => {
  const token = createCsrfToken('secret', 1000);
  assert.equal(verifyCsrfToken(token, 'secret', 1000, 1500), true);
});

test('CSRF token rejects tampering and expiry', () => {
  const token = createCsrfToken('secret', 1000);
  assert.equal(verifyCsrfToken(`${token}x`, 'secret', 1000, 1500), false);
  assert.equal(verifyCsrfToken(token, 'other', 1000, 1500), false);
  assert.equal(verifyCsrfToken(token, 'secret', 100, 1500), false);
});
