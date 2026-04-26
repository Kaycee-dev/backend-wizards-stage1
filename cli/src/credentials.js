const fs = require('fs');
const os = require('os');
const path = require('path');

function insightaHome() {
  return process.env.INSIGHTA_HOME || path.join(os.homedir(), '.insighta');
}

function credentialsPath() {
  return path.join(insightaHome(), 'credentials.json');
}

function readCredentials() {
  const file = credentialsPath();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Could not read credentials at ${file}`);
  }
}

function writeCredentials(credentials) {
  const dir = insightaHome();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = credentialsPath();
  fs.writeFileSync(file, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch (err) {
    // Windows may ignore POSIX file modes.
  }
}

function clearCredentials() {
  const file = credentialsPath();
  if (fs.existsSync(file)) {
    fs.rmSync(file);
  }
}

module.exports = {
  clearCredentials,
  credentialsPath,
  readCredentials,
  writeCredentials,
};
