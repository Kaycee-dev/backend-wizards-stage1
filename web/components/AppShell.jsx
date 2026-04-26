import Link from 'next/link';
import { requireSession } from '../lib/session';

export default async function AppShell({ children }) {
  const session = await requireSession();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Insighta Labs+</div>
        <nav className="nav" aria-label="Primary">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/profiles">Profiles</Link>
          <Link href="/search">Search</Link>
          <Link href="/account">Account</Link>
        </nav>
      </aside>
      <main className="main">
        <div className="topline">
          <div>
            <strong>@{session.user?.username || 'user'}</strong>
            <span className="muted"> · {session.user?.role || 'analyst'}</span>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
