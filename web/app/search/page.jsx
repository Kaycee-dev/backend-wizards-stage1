import AppShell from '../../components/AppShell';
import { backendJson } from '../../lib/backend';

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = params.q || '';
  const payload = q
    ? await backendJson(`/api/profiles/search?q=${encodeURIComponent(q)}`)
    : { data: [], page: 1, total: 0, total_pages: 0 };

  return (
    <AppShell>
      <h1>Search</h1>
      <form className="filters" method="get">
        <input name="q" defaultValue={q} placeholder="young males from nigeria" />
        <button type="submit">Search</button>
      </form>
      <section className="panel">
        <table>
          <thead>
            <tr><th>Name</th><th>Gender</th><th>Age</th><th>Country</th></tr>
          </thead>
          <tbody>
            {payload.data.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.name}</td>
                <td>{profile.gender}</td>
                <td>{profile.age}</td>
                <td>{profile.country_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
