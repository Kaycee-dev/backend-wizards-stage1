import { NextResponse } from 'next/server';
import { backendFetch } from '../../../../lib/backend';
import csrfUtils from '../../../../lib/csrf.cjs';

export async function POST(request) {
  const form = await request.formData();
  const csrf = form.get('_csrf');
  const cookieToken = request.cookies.get('insighta_csrf')?.value;
  const secret = process.env.CSRF_SECRET || 'dev-csrf-secret';
  if (!csrf || csrf !== cookieToken || !csrfUtils.verifyCsrfToken(String(csrf), secret)) {
    return NextResponse.json({ status: 'error', message: 'Invalid CSRF token' }, { status: 403 });
  }
  const name = form.get('name');
  const res = await backendFetch('/api/profiles', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ message: 'Create failed' }));
    return NextResponse.json({ status: 'error', message: payload.message }, { status: res.status });
  }
  return NextResponse.redirect(new URL('/profiles', request.url), 303);
}
