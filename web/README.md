# Insighta Web Portal

Next.js 15 (App Router) web portal for the Insighta Labs+ Stage 3
secure-access platform. The portal is one of two interfaces — alongside the
[CLI](https://github.com/Kaycee-dev/insighta-stage3-cli) — into a
[shared backend](https://github.com/Kaycee-dev/insighta-stage3-backend).

## System Architecture

- Next.js App Router with React Server Components.
- All backend calls run server-side via `lib/backend.js`; **no app tokens
  ever reach the browser**.
- Sessions live in three HTTP-only cookies: `insighta_access`,
  `insighta_refresh`, and `insighta_user` (base64url-encoded JSON of the
  public user shape, used only for non-secret display).
- `middleware.js` refreshes the access cookie before page render when it is
  missing or within 10s of expiry, on `/dashboard/*`, `/profiles/*`,
  `/search/*`, `/account/*`, and `/api/:path*` GET routes. Non-GET methods
  are skipped so POST bodies are not lost across a 307.
- CSRF protection on the create-profile route via `lib/csrf.cjs`.

## Pages

- `/login` — GitHub OAuth entry
- `/dashboard` — basic metrics + recent profiles
- `/profiles` — list with filters, prev/next pagination, and **Export CSV**
- `/profiles/[id]` — profile detail
- `/search` — natural language search with prev/next pagination
- `/account` — current user, role, sign out

## Auth Flow (Web)

1. User clicks **Continue with GitHub** → backend
   `/auth/github?client=web&return_to=<web>`.
2. Backend signs OAuth state into an HTTP-only cookie scoped to
   `/auth/github` and 302s to GitHub authorize.
3. After authorize, GitHub redirects to backend `/auth/github/callback`.
4. Backend verifies state, upserts the user, mints a one-shot web auth code,
   and 302s to `<web>/auth/callback?code=<one-shot>`.
5. The web `/auth/callback` route handler POSTs the one-shot code to backend
   `/auth/web/session`.
6. Backend issues an app access + refresh pair. The route handler attaches
   them to the redirect response as HTTP-only cookies and lands on
   `/dashboard`.

## Token Handling

- Access token: signed app JWT, 3-minute expiry, stored in `insighta_access`
  with `HttpOnly; Secure; SameSite=Lax`.
- Refresh token: 5-minute opaque random string, stored in `insighta_refresh`
  with the same flags. The backend stores only its SHA-256 hash and
  invalidates it on use.
- `middleware.js` decodes the access JWT's `exp` claim before each protected
  GET. If the token is missing or within 10 seconds of expiry, it POSTs to
  `/auth/refresh`, sets the new cookies on the redirect response, and
  re-issues the original navigation.
- Logout (`POST /api/auth/logout`) revokes the refresh server-side and clears
  all three cookies on the redirect response.

## Role Enforcement

- Roles come from the backend and are surfaced to the UI through
  `insighta_user.role`.
- The Account page shows the current role.
- The Profiles list hides the **Create profile** affordance for analysts; the
  create route handler also runs CSRF verification and the backend rejects
  analyst writes with `403 Forbidden`.
- All API calls go through `backendFetch`, which always sends
  `Authorization: Bearer <access>` and `X-API-Version: 1`. The backend
  enforces auth and role on every `/api/*` request.

## Natural Language Parsing

Search delegates to backend `/api/profiles/search?q=<text>`. The backend
parser handles gender, age groups, age ranges (`between 50 and 59`,
`under 30`, `60 or older`), decade phrases (`in their 50s`, `in the 40s`),
country names + demonyms (`canadian`, `british`, `south african`,
`nigerian`), probability thresholds, sort phrases (`oldest first`,
`highest gender confidence`), and compound clauses joined by `and` / `or`.
See the
[backend README](https://github.com/Kaycee-dev/insighta-stage3-backend#natural-language-parsing)
for the full grammar.

## CLI Parity

The same backend powers both surfaces. Anything the portal does, the
[CLI](https://github.com/Kaycee-dev/insighta-stage3-cli) can do too —
including filtered CSV export.

## Local Development

```bash
cp .env.example .env.local
# Edit .env.local and set:
#   BACKEND_API_URL=http://localhost:3000
#   NEXT_PUBLIC_WEB_APP_URL=http://localhost:3001
#   SESSION_COOKIE_SECURE=false   (true in production)
#   CSRF_SECRET=<random>
npm install
npm run dev    # http://localhost:3001
npm run build  # production build
npm test       # CSRF utility tests
```

## Required Environment

```env
BACKEND_API_URL=https://<backend-host>
NEXT_PUBLIC_WEB_APP_URL=https://<web-host>
SESSION_COOKIE_SECURE=true
CSRF_SECRET=<random-secret>
```
