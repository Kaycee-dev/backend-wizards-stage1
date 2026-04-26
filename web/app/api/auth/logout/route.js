import { NextResponse } from 'next/server';
import { backendUrl, clearSessionCookies, readSession } from '../../../../lib/session';

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
  await clearSessionCookies();
  return NextResponse.redirect(new URL('/login', request.url), 303);
}
