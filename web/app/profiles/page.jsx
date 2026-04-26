import Link from 'next/link';
import AppShell from '../../components/AppShell';
import { backendJson, profileQuery } from '../../lib/backend';

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
      <p className="muted">Page {payload.page} of {payload.total_pages || 1} · Total {payload.total}</p>
    </AppShell>
  );
}
