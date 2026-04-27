# Stage 3 Evidence Log

- Baseline before Stage 3 changes: `npm test` passed `30/30`.
- After backend auth/RBAC/API work: `npm test` passed `40/40`; `npm run lint` passed.
- CLI package: `npm test` passed `3/3`; `npm run lint` and `npm pack --dry-run` passed.
- Web package: `npm test` passed `2/2`; `npm run lint`, `npm run build`, and `npm audit --omit=dev` passed.
- Final audit tightened `/auth/refresh` to the exact TRD response shape, added visible web pagination controls, added web middleware token refresh, and added `docs/stage3/grading-audit.md`.
- Follow-up audit fixed natural-language between-age parsing for queries such as `women from tanzania between the ages of 50 and 54 inclusive`.
- Final NLS hardening added grouped OR demographic clauses, repeated-country filters, confidence-threshold parsing, exclusive/inclusive age-bound synonyms, and all-flat-field coverage in one NLS query; `npm test` passed `49/49`; `npm run lint` passed.
- Post-deploy parser audit removed the 2-letter country-code-as-NL-alias leak (e.g., "in" matching India), added demonyms for all 65 seed countries, added decade detection (`in their 50s` → 50–59), and loosened the compound-clause splitter to handle adjective-prefixed starters (`canadian men`, `south african adults`); `npm test` passed `53/53`; `npm run lint` passed.
- Web portal gained a visible **Export CSV** affordance on the Profiles page, wired through a new `/api/profiles/export` Next.js route handler that proxies to the backend export endpoint with bearer auth + `X-API-Version: 1` and streams the CSV back to the browser.
- Web token-refresh middleware extended to `/api/:path*` (GET only) so the access token is rotated before idempotent API hits like `/api/profiles/export` reach the backend; non-GET POSTs are skipped to avoid 307 body-drop.
