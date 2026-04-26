import AppShell from '../../components/AppShell';
import { backendJson } from '../../lib/backend';

export default async function DashboardPage() {
  const profiles = await backendJson('/api/profiles?limit=1');
  const recent = await backendJson('/api/profiles?limit=5&sort_by=created_at&order=desc');

  return (
    <AppShell>
      <h1>Dashboard</h1>
      <section className="grid">
        <div className="card">
          <div className="muted">Profiles</div>
          <div className="metric">{profiles.total}</div>
        </div>
        <div className="card">
          <div className="muted">Pages</div>
          <div className="metric">{profiles.total_pages}</div>
        </div>
      </section>
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Recent profiles</h2>
        <table>
          <thead>
            <tr><th>Name</th><th>Gender</th><th>Age</th><th>Country</th></tr>
          </thead>
          <tbody>
            {recent.data.map((profile) => (
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
