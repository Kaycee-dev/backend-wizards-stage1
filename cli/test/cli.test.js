const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { clearCredentials, credentialsPath, readCredentials, writeCredentials } = require('../src/credentials');
const { codeChallenge } = require('../src/pkce');
const { parseFlags, toQuery } = require('../src/index');

test('PKCE challenge is deterministic and base64url encoded', () => {
  const challenge = codeChallenge('abc123');
  assert.match(challenge, /^[A-Za-z0-9_-]+$/);
  assert.equal(challenge, codeChallenge('abc123'));
});

test('credentials are stored at ~/.insighta/credentials.json equivalent', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'insighta-cli-'));
  process.env.INSIGHTA_HOME = temp;
  try {
    writeCredentials({ api_url: 'http://localhost:3000', access_token: 'a', refresh_token: 'r' });
    assert.equal(credentialsPath(), path.join(temp, 'credentials.json'));
    assert.equal(readCredentials().refresh_token, 'r');
    clearCredentials();
    assert.equal(readCredentials(), null);
  } finally {
    delete process.env.INSIGHTA_HOME;
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('flag parser and profile query mapping use backend parameter names', () => {
  const { flags, rest } = parseFlags(['--gender', 'male', '--country', 'NG', '--age-group', 'adult', 'positional']);
  assert.deepEqual(rest, ['positional']);
  assert.equal(flags.gender, 'male');
  assert.equal(toQuery(flags), '?age_group=adult&country_id=NG&gender=male');
});
