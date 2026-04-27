import Link from 'next/link';
import AppShell from '../../components/AppShell';
import { backendJson, profileQuery } from '../../lib/backend';

const EXPORT_KEYS = [
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

function pageHref(params, page) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value) query.set(key, value);
  }
  query.set('page', String(page));
  const serialized = query.toString();
  return serialized ? `/profiles?${serialized}` : '/profiles';
}

function exportHref(params) {
  const query = new URLSearchParams();
  for (const key of EXPORT_KEYS) {
    const value = params?.[key];
    if (value) query.set(key, value);
  }
  query.set('format', 'csv');
  return `/api/profiles/export?${query.toString()}`;
}

export default async function ProfilesPage({ searchParams }) {
  const params = await searchParams;
  const payload = await backendJson(`/api/profiles${profileQuery(params)}`);

  return (
    <AppShell>
      <h1>Profiles</h1>
      <form className="filters" method="get">
        <select name="gender" defaultValue={params.gender || ''}>
          <option value="">Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input name="country_id" defaultValue={params.country_id || ''} placeholder="Country code" />
        <select name="age_group" defaultValue={params.age_group || ''}>
          <option value="">Age group</option>
          <option value="child">Child</option>
          <option value="teenager">Teenager</option>
          <option value="adult">Adult</option>
          <option value="senior">Senior</option>
        </select>
        <input name="min_age" defaultValue={params.min_age || ''} placeholder="Min age" />
        <input name="max_age" defaultValue={params.max_age || ''} placeholder="Max age" />
        <button type="submit">Apply</button>
        <a className="button secondary" href={exportHref(params)}>Export CSV</a>
      </form>
      <section className="panel">
        <table>
          <thead>
            <tr><th>Name</th><th>Gender</th><th>Age</th><th>Country</th><th></th></tr>
          </thead>
          <tbody>
            {payload.data.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.name}</td>
                <td>{profile.gender}</td>
                <td>{profile.age}</td>
                <td>{profile.country_name}</td>
                <td><Link href={`/profiles/${profile.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="topline" style={{ marginTop: 16 }}>
        <p className="muted">Page {payload.page} of {payload.total_pages || 1} · Total {payload.total}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {payload.links?.prev ? (
            <Link className="button secondary" href={pageHref(params, payload.page - 1)}>Previous</Link>
          ) : null}
          {payload.links?.next ? (
            <Link className="button secondary" href={pageHref(params, payload.page + 1)}>Next</Link>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
