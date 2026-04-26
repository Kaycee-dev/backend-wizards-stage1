import { NextResponse } from 'next/server';
import { applySessionCookies, backendUrl } from '../../../lib/session';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }
  const res = await fetch(`${backendUrl()}/auth/web/session`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
    cache: 'no-store',
  });
  if (!res.ok) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }
  const payload = await res.json();
  return applySessionCookies(NextResponse.redirect(new URL('/dashboard', url.origin)), payload);
}
