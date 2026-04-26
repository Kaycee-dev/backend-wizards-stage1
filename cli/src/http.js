const { readCredentials, writeCredentials } = require('./credentials');

function apiBaseUrl(credentials) {
  return (
    process.env.INSIGHTA_API_URL ||
    (credentials && credentials.api_url) ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await parseResponse(res);
  if (!res.ok) {
    const message = payload && payload.message ? payload.message : `Request failed with ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function refreshCredentials(credentials) {
  if (!credentials || !credentials.refresh_token) {
    throw new Error('Not logged in. Run insighta login.');
  }
  const baseUrl = apiBaseUrl(credentials);
  const payload = await requestJson(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refresh_token: credentials.refresh_token }),
  });
  const next = {
    ...credentials,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    user: payload.user || credentials.user,
    updated_at: new Date().toISOString(),
  };
  writeCredentials(next);
  return next;
}

async function apiFetch(path, options = {}) {
  let credentials = readCredentials();
  if (!credentials) {
    throw new Error('Not logged in. Run insighta login.');
  }
  const baseUrl = apiBaseUrl(credentials);
  const makeRequest = (creds) => fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: options.accept || 'application/json',
      Authorization: `Bearer ${creds.access_token}`,
      'X-API-Version': '1',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  let res = await makeRequest(credentials);
  if (res.status === 401) {
    credentials = await refreshCredentials(credentials);
    res = await makeRequest(credentials);
  }
  return res;
}

async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  const payload = await parseResponse(res);
  if (!res.ok) {
    const message = payload && payload.message ? payload.message : `Request failed with ${res.status}`;
    throw new Error(message);
  }
  return payload;
}

module.exports = {
  apiBaseUrl,
  apiFetch,
  apiJson,
  refreshCredentials,
  requestJson,
};
