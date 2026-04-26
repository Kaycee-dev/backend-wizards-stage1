import { backendUrl, webUrl } from '../../lib/session';

export default function LoginPage() {
  const loginUrl = new URL('/auth/github', backendUrl());
  loginUrl.searchParams.set('client', 'web');
  loginUrl.searchParams.set('return_to', webUrl());

  return (
    <main className="login">
      <section className="panel">
        <h1>Insighta Labs+</h1>
        <p className="muted">Secure access for analysts and administrators.</p>
        <a className="button" href={loginUrl.toString()}>Continue with GitHub</a>
      </section>
    </main>
  );
}
