import AppShell from '../../../components/AppShell';
import { backendJson } from '../../../lib/backend';

export default async function ProfileDetailPage({ params }) {
  const { id } = await params;
  const payload = await backendJson(`/api/profiles/${encodeURIComponent(id)}`);
  const profile = payload.data;

  return (
    <AppShell>
      <h1>{profile.name}</h1>
      <section className="panel">
        <table>
          <tbody>
            {Object.entries(profile).map(([key, value]) => (
              <tr key={key}>
                <th>{key}</th>
                <td>{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
