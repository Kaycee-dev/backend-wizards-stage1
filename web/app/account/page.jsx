import AppShell from '../../components/AppShell';
import { backendJson } from '../../lib/backend';

export default async function AccountPage() {
  const payload = await backendJson('/auth/whoami');
  const user = payload.data;

  return (
    <AppShell>
      <h1>Account</h1>
      <section className="panel">
        <table>
          <tbody>
            <tr><th>GitHub</th><td>@{user.username}</td></tr>
            <tr><th>Role</th><td>{user.role}</td></tr>
            <tr><th>Status</th><td>{user.is_active ? 'Active' : 'Inactive'}</td></tr>
            <tr><th>Email</th><td>{user.email || 'Not provided'}</td></tr>
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
