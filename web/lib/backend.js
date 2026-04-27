import { redirect } from 'next/navigation';
import { backendUrl, readSession } from './session';

export async function backendFetch(path, init = {}) {
  const session = await readSession();
  if (!session.accessToken) redirect('/login');
  const buildRequest = (accessToken) => fetch(`${backendUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'X-API-Version': '1',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });

  return buildRequest(session.accessToken);
}

export async function backendJson(path, init = {}) {
  const res = await backendFetch(path, init);
  const payload = await res.json().catch(() => ({}));
  if (res.status === 401) redirect('/login');
  if (!res.ok) {
    throw new Error(payload.message || `Backend request failed with ${res.status}`);
  }
  return payload;
}

export function profileQuery(searchParams = {}) {
  const params = new URLSearchParams();
  for (const key of ['gender', 'country_id', 'age_group', 'min_age', 'max_age', 'sort_by', 'order', 'page', 'limit']) {
    const value = searchParams[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}
