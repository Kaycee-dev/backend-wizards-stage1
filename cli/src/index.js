const http = require('http');
const { spawn } = require('child_process');
const { clearCredentials, readCredentials, writeCredentials } = require('./credentials');
const { apiBaseUrl, apiFetch, apiJson, requestJson } = require('./http');
const { codeChallenge, randomToken } = require('./pkce');

function printHelp() {
  console.log(`Insighta Labs+

Usage:
  insighta login [--api-url http://localhost:3000]
  insighta logout
  insighta whoami
  insighta profiles list [filters]
  insighta profiles get <id>
  insighta profiles search "young males from nigeria"
  insighta profiles create --name "Harriet Tubman"
  insighta profiles export --format csv [filters]
`);
}

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i += 1;
  }
  return { flags, rest };
}

function toQuery(flags, allowed) {
  const params = new URLSearchParams();
  const map = {
    'age-group': 'age_group',
    country: 'country_id',
    gender: 'gender',
    limit: 'limit',
    'max-age': 'max_age',
    'min-age': 'min_age',
    order: 'order',
    page: 'page',
    'sort-by': 'sort_by',
  };
  for (const [flag, param] of Object.entries(map)) {
    if (flags[flag] !== undefined && (!allowed || allowed.has(flag))) {
      params.set(param, String(flags[flag]));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function showTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No rows found.');
    return;
  }
  const columns = ['id', 'name', 'gender', 'age', 'age_group', 'country_id', 'country_name'];
  const widths = {};
  for (const column of columns) {
    widths[column] = Math.max(
      column.length,
      ...rows.map((row) => String(row[column] === undefined ? '' : row[column]).length)
    );
  }
  console.log(columns.map((column) => column.padEnd(widths[column])).join('  '));
  console.log(columns.map((column) => '-'.repeat(widths[column])).join('  '));
  for (const row of rows) {
    console.log(columns.map((column) => String(row[column] === undefined ? '' : row[column]).padEnd(widths[column])).join('  '));
  }
}

async function withLoader(label, work) {
  if (process.env.INSIGHTA_NO_SPINNER || process.env.CI) {
    return work();
  }
  const frames = ['-', '\\', '|', '/'];
  let index = 0;
  process.stdout.write(`${label} ${frames[index]}`);
  const timer = setInterval(() => {
    index = (index + 1) % frames.length;
    process.stdout.write(`\r${label} ${frames[index]}`);
  }, 100);
  try {
    return await work();
  } finally {
    clearInterval(timer);
    process.stdout.write(`\r${' '.repeat(label.length + 2)}\r`);
  }
}

function openBrowser(url) {
  if (process.env.INSIGHTA_NO_BROWSER) {
    console.log(url);
    return;
  }
  const platform = process.platform;
  let command;
  let args;
  if (platform === 'win32') {
    // Avoid `cmd /c start "" <url>` because cmd treats `&` as a command
    // separator and truncates the URL at the first query-string ampersand,
    // which strips redirect_uri / state / code_challenge.
    command = 'rundll32';
    args = ['url.dll,FileProtocolHandler', url];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else {
    command = 'xdg-open';
    args = [url];
  }
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.unref();
}

function waitForCallback(state) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== '/callback') {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      if (url.searchParams.get('state') !== state) {
        res.statusCode = 400;
        res.end('Invalid OAuth state');
        reject(new Error('Invalid OAuth state'));
        server.close();
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) {
        res.statusCode = 400;
        res.end('Missing OAuth code');
        reject(new Error('Missing OAuth code'));
        server.close();
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>Insighta login complete</h1><p>You can return to the terminal.</p>');
      resolve({ code, redirectUri: `http://127.0.0.1:${server.address().port}/callback` });
      server.close();
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      waitForCallback.redirectUri = `http://127.0.0.1:${port}/callback`;
    });
  });
}

async function login(args) {
  const { flags } = parseFlags(args);
  const apiUrl = (flags['api-url'] || process.env.INSIGHTA_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = codeChallenge(verifier);
  waitForCallback.redirectUri = null;
  const callbackPromise = waitForCallback(state);

  while (!waitForCallback.redirectUri) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const redirectUri = waitForCallback.redirectUri;
  const authUrl = new URL(`${apiUrl}/auth/github`);
  authUrl.searchParams.set('client', 'cli');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);

  console.log('Opening GitHub login...');
  openBrowser(authUrl.toString());
  const callback = await callbackPromise;
  const payload = await withLoader('Exchanging OAuth code', () => requestJson(`${apiUrl}/auth/github/cli`, {
    method: 'POST',
    body: JSON.stringify({
      code: callback.code,
      code_verifier: verifier,
      redirect_uri: callback.redirectUri,
    }),
  }));
  writeCredentials({
    api_url: apiUrl,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    user: payload.user,
    updated_at: new Date().toISOString(),
  });
  console.log(`Logged in as @${payload.user.username}`);
}

async function logout() {
  const credentials = readCredentials();
  if (credentials) {
    try {
      await requestJson(`${apiBaseUrl(credentials)}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: credentials.refresh_token }),
      });
    } catch (err) {
      // Local credential cleanup is still useful if the remote token already expired.
    }
  }
  clearCredentials();
  console.log('Logged out.');
}

async function whoami() {
  const payload = await withLoader('Loading account', () => apiJson('/auth/whoami'));
  const user = payload.data;
  console.log(`@${user.username} (${user.role})`);
}

async function profiles(args) {
  const [subcommand, ...rest] = args;
  const { flags, rest: positional } = parseFlags(rest);
  if (subcommand === 'list') {
    const payload = await withLoader('Fetching profiles', () => apiJson(`/api/profiles${toQuery(flags)}`));
    showTable(payload.data);
    console.log(`Page ${payload.page}/${payload.total_pages || 1} · Total ${payload.total}`);
    return;
  }
  if (subcommand === 'get') {
    const id = positional[0];
    if (!id) throw new Error('Profile id is required.');
    const payload = await withLoader('Fetching profile', () => apiJson(`/api/profiles/${encodeURIComponent(id)}`));
    console.log(JSON.stringify(payload.data, null, 2));
    return;
  }
  if (subcommand === 'search') {
    const q = positional.join(' ');
    if (!q) throw new Error('Search query is required.');
    const params = new URLSearchParams({ q });
    const pageQuery = toQuery(flags, new Set(['page', 'limit', 'sort-by', 'order']));
    if (pageQuery) {
      for (const [key, value] of new URLSearchParams(pageQuery.slice(1))) params.set(key, value);
    }
    const payload = await withLoader('Searching profiles', () => apiJson(`/api/profiles/search?${params.toString()}`));
    showTable(payload.data);
    console.log(`Page ${payload.page}/${payload.total_pages || 1} · Total ${payload.total}`);
    return;
  }
  if (subcommand === 'create') {
    if (!flags.name || typeof flags.name !== 'string') throw new Error('--name is required.');
    const payload = await withLoader('Creating profile', () => apiJson('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name: flags.name }),
    }));
    console.log(JSON.stringify(payload.data, null, 2));
    return;
  }
  if (subcommand === 'export') {
    if (flags.format !== 'csv') throw new Error('--format csv is required.');
    const query = toQuery(flags);
    const separator = query ? '&' : '?';
    const res = await withLoader('Exporting profiles', () => apiFetch(`/api/profiles/export${query}${separator}format=csv`, {
      accept: 'text/csv',
    }));
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.message || `Export failed with ${res.status}`);
    }
    const csv = await res.text();
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `profiles_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    require('fs').writeFileSync(filename, csv);
    console.log(`Saved ${filename}`);
    return;
  }
  throw new Error('Unknown profiles command.');
}

async function main(argv) {
  const [, , command, ...args] = argv;
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === 'login') return login(args);
  if (command === 'logout') return logout();
  if (command === 'whoami') return whoami();
  if (command === 'profiles') return profiles(args);
  throw new Error(`Unknown command: ${command}`);
}

module.exports = {
  main,
  parseFlags,
  showTable,
  toQuery,
};
