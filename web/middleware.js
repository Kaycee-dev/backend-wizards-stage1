import { NextResponse } from 'next/server';

const ACCESS_COOKIE = 'insighta_access';
const REFRESH_COOKIE = 'insighta_refresh';

function backendUrl() {
  return (process.env.BACKEND_API_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function webUrl(request) {
  return process.env.NEXT_PUBLIC_WEB_APP_URL || request.nextUrl.origin;
}

function cookieSecure(request) {
  return process.env.SESSION_COOKIE_SECURE === 'true' || webUrl(request).startsWith('https://');
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch (err) {
    return null;
  }
}

function isExpiredOrNearExpiry(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + 10;
}

function setSessionCookies(response, tokenPair, request) {
  const common = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: cookieSecure(request),
  };
  response.cookies.set(ACCESS_COOKIE, tokenPair.access_token, { ...common, maxAge: tokenPair.expires_in || 180 });
  response.cookies.set(REFRESH_COOKIE, tokenPair.refresh_token, { ...common, maxAge: tokenPair.refresh_expires_in || 300 });
  if (tokenPair.user) {
    response.cookies.set('insighta_user', btoa(JSON.stringify(tokenPair.user)), { ...common, maxAge: tokenPair.refresh_expires_in || 300 });
  } else {
    const existingUser = request.cookies.get('insighta_user')?.value;
    if (existingUser) {
      response.cookies.set('insighta_user', existingUser, { ...common, maxAge: tokenPair.refresh_expires_in || 300 });
    }
  }
}

function clearSessionCookies(response, request) {
  const common = {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: cookieSecure(request),
  };
  response.cookies.set(ACCESS_COOKIE, '', common);
  response.cookies.set(REFRESH_COOKIE, '', common);
  response.cookies.set('insighta_user', '', common);
}

export async function middleware(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (accessToken && !isExpiredOrNearExpiry(accessToken)) {
    return NextResponse.next();
  }
  if (!refreshToken) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookies(response, request);
    return response;
  }

  const refresh = await fetch(`${backendUrl()}/auth/refresh`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  }).catch(() => null);

  if (!refresh?.ok) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookies(response, request);
    return response;
  }

  const payload = await refresh.json();
  const response = NextResponse.redirect(request.nextUrl);
  setSessionCookies(response, payload, request);
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/profiles/:path*', '/search/:path*', '/account/:path*'],
};
