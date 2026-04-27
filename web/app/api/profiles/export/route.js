import { backendFetch } from '../../../../lib/backend';

const ALLOWED = [
  'format',
  'gender',
  'age_group',
  'country_id',
  'min_age',
  'max_age',
  'min_gender_probability',
  'min_country_probability',
  'sort_by',
  'order',
];

export async function GET(request) {
  const url = new URL(request.url);
  const params = new URLSearchParams();
  for (const key of ALLOWED) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  if (!params.get('format')) params.set('format', 'csv');

  const res = await backendFetch(`/api/profiles/export?${params.toString()}`, {
    headers: { Accept: 'text/csv' },
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ message: 'Export failed' }));
    return Response.json({ status: 'error', message: payload.message }, { status: res.status });
  }

  const body = await res.text();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('content-type') || 'text/csv; charset=utf-8',
      'Content-Disposition':
        res.headers.get('content-disposition') ||
        `attachment; filename="profiles_${timestamp}.csv"`,
    },
  });
}
