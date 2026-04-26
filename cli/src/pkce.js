const crypto = require('crypto');

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function randomToken(bytes = 32) {
  return base64Url(crypto.randomBytes(bytes));
}

function codeChallenge(verifier) {
  return base64Url(crypto.createHash('sha256').update(verifier).digest());
}

module.exports = { codeChallenge, randomToken };
