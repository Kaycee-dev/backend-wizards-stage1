import { NextResponse } from 'next/server';
import { backendUrl, clearSessionCookiesOn, readSession } from '../../../../lib/session';

export async function POST(request) {
  const session = await readSession();
  if (session.refreshToken) {
    await fetch(`${backendUrl()}/auth/logout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
      cache: 'no-store',
    }).catch(() => null);
  }
  return clearSessionCookiesOn(NextResponse.redirect(new URL('/login', request.url), 303));
}
