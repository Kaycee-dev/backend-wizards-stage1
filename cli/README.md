# Insighta CLI

Global Node.js CLI for the Insighta Labs+ Stage 3 secure-access platform. The
CLI is one of two interfaces — alongside the
[web portal](https://github.com/Kaycee-dev/insighta-stage3-web) — into a
[shared backend](https://github.com/Kaycee-dev/insighta-stage3-backend).

## System Architecture

- Standalone npm package; `bin/insighta.js` registers the global `insighta`
  binary on install.
- All API calls go to the shared backend. The URL is taken from
  `--api-url` on `login`, falls back to `INSIGHTA_API_URL`, then to the value
  saved in `~/.insighta/credentials.json`.
- Credentials live at `~/.insighta/credentials.json` (mode 0600 on POSIX).
- Login uses GitHub OAuth with PKCE through a temporary loopback HTTP server.

## Installation

```bash
git clone https://github.com/Kaycee-dev/insighta-stage3-cli
cd insighta-stage3-cli
npm install -g .
```

After `npm install -g .`, the `insighta` command works from any directory.

## Auth Flow (CLI / PKCE Loopback)

1. `insighta login --api-url <backend-url>`
2. CLI generates `state`, `code_verifier`, and S256 `code_challenge`.
3. CLI starts a temporary HTTP server on `http://127.0.0.1:<random-port>/callback`.
4. CLI opens the browser to
   `<backend>/auth/github?client=cli&redirect_uri=http://127.0.0.1:<port>/callback&state=...&code_challenge=...&code_challenge_method=S256`.
5. Backend redirects to the GitHub OAuth authorize page.
6. After the user authorizes, GitHub redirects back to the CLI's loopback
   server with `code` and `state`.
7. CLI validates `state`, then POSTs `code + code_verifier + redirect_uri` to
   `<backend>/auth/github/cli`.
8. Backend exchanges the code with GitHub, upserts the user (applying the
   admin allowlist), and returns the app access + refresh token pair.
9. CLI stores the tokens at `~/.insighta/credentials.json` and prints
   `Logged in as @<username>`.

## Token Handling

- Access token: signed app JWT, 3-minute expiry.
- Refresh token: 5-minute opaque random string. Only its SHA-256 hash is
  stored in the backend.
- Every request sends `Authorization: Bearer <access>` and `X-API-Version: 1`.
- On any `401`, the CLI calls `POST <backend>/auth/refresh` once with the
  refresh token. Success rotates both tokens and the request is retried;
  failure prints `Session expired. Run insighta login.`
- Logout calls `POST /auth/logout` to revoke the refresh server-side and
  removes the local credentials file.

## Commands

```bash
insighta login [--api-url <url>]
insighta logout
insighta whoami

insighta profiles list [--gender male|female]
                       [--country <ISO2>]
                       [--age-group child|teenager|adult|senior]
                       [--min-age N] [--max-age N]
                       [--sort-by age|created_at|gender_probability]
                       [--order asc|desc]
                       [--page N] [--limit N]

insighta profiles get <id>
insighta profiles search "<natural language query>"
insighta profiles create --name "<full name>"        # admin only
insighta profiles export --format csv [filters above]
```

CSV exports are written to the current working directory as
`profiles_<timestamp>.csv`.

## Role Enforcement (CLI's view)

- The CLI does not perform local role checks; it forwards every request and
  surfaces the backend's response.
- `insighta profiles create` as an analyst returns `403 Forbidden`, which the
  CLI prints as a clear error.
- `insighta whoami` shows the user's current role; the same role applies
  across CLI and web portal because both surfaces share the same backend.

## Natural Language Parsing

NL queries pass through to `<backend>/api/profiles/search?q=...`. The backend
parser extracts gender, age groups, age ranges, decade phrases (`in their
50s`), country names + demonyms (`canadian`, `british`, `south african`,
`nigerian`), probability thresholds, sort phrases, and compound clauses
joined by `and` / `or`. See the
[backend README](https://github.com/Kaycee-dev/insighta-stage3-backend#natural-language-parsing)
for the full grammar.

## Tests

```bash
npm test
```

Covers PKCE challenge derivation, credential storage location, and the
flag-to-query mapping that drives `insighta profiles list`.
