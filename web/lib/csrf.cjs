const crypto = require('crypto');

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(value, secret) {
  return base64Url(crypto.createHmac('sha256', secret).update(value).digest());
}

function createCsrfToken(secret, now = Date.now()) {
  const nonce = base64Url(crypto.randomBytes(24));
  const issuedAt = String(now);
  const unsigned = `${nonce}.${issuedAt}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

function verifyCsrfToken(token, secret, maxAgeMs = 60 * 60 * 1000, now = Date.now()) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [nonce, issuedAt, signature] = parts;
  const unsigned = `${nonce}.${issuedAt}`;
  const expected = sign(unsigned, secret);
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const age = now - Number(issuedAt);
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}

module.exports = { createCsrfToken, verifyCsrfToken };
