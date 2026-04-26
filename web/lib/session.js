import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ACCESS_COOKIE = 'insighta_access';
const REFRESH_COOKIE = 'insighta_refresh';
const USER_COOKIE = 'insighta_user';

export function backendUrl() {
  return (process.env.BACKEND_API_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function webUrl() {
  return (process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export function cookieSecure() {
  return process.env.SESSION_COOKIE_SECURE === 'true' || webUrl().startsWith('https://');
}

export async function readSession() {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value || null;
  const refreshToken = jar.get(REFRESH_COOKIE)?.value || null;
  const rawUser = jar.get(USER_COOKIE)?.value || null;
  let user = null;
  if (rawUser) {
    try {
      user = JSON.parse(Buffer.from(rawUser, 'base64url').toString('utf8'));
    } catch (err) {
      user = null;
    }
  }
  return { accessToken, refreshToken, user };
}

export async function requireSession() {
  const session = await readSession();
  if (!session.accessToken) redirect('/login');
  return session;
}

export async function setSessionCookies(tokenPair) {
  const jar = await cookies();
  const common = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: cookieSecure(),
  };
  jar.set(ACCESS_COOKIE, tokenPair.access_token, { ...common, maxAge: tokenPair.expires_in || 180 });
  jar.set(REFRESH_COOKIE, tokenPair.refresh_token, { ...common, maxAge: tokenPair.refresh_expires_in || 300 });
  jar.set(USER_COOKIE, Buffer.from(JSON.stringify(tokenPair.user || {})).toString('base64url'), {
    ...common,
    maxAge: tokenPair.refresh_expires_in || 300,
  });
}

export async function refreshSession() {
  const session = await readSession();
  if (!session.refreshToken) return null;
  const res = await fetch(`${backendUrl()}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const payload = await res.json();
  await setSessionCookies(payload);
  return payload;
}

export async function clearSessionCookies() {
  const jar = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE]) {
    jar.set(name, '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: cookieSecure(),
    });
  }
}

export const cookieNames = {
  access: ACCESS_COOKIE,
  refresh: REFRESH_COOKIE,
  user: USER_COOKIE,
};
