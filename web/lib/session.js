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

function sessionCookieAttrs(tokenPair) {
  const common = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: cookieSecure(),
  };
  return [
    [ACCESS_COOKIE, tokenPair.access_token, { ...common, maxAge: tokenPair.expires_in || 180 }],
    [REFRESH_COOKIE, tokenPair.refresh_token, { ...common, maxAge: tokenPair.refresh_expires_in || 300 }],
    [
      USER_COOKIE,
      Buffer.from(JSON.stringify(tokenPair.user || {})).toString('base64url'),
      { ...common, maxAge: tokenPair.refresh_expires_in || 300 },
    ],
  ];
}

export function applySessionCookies(response, tokenPair) {
  for (const [name, value, opts] of sessionCookieAttrs(tokenPair)) {
    response.cookies.set(name, value, opts);
  }
  return response;
}

function clearedCookieAttrs() {
  const opts = {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: cookieSecure(),
  };
  return [ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE].map((name) => [name, '', opts]);
}

export function clearSessionCookiesOn(response) {
  for (const [name, value, opts] of clearedCookieAttrs()) {
    response.cookies.set(name, value, opts);
  }
  return response;
}

export const cookieNames = {
  access: ACCESS_COOKIE,
  refresh: REFRESH_COOKIE,
  user: USER_COOKIE,
};
