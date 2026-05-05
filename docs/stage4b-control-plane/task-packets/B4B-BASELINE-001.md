# B4B-BASELINE-001 - Baseline Inspection

## Goal

Inspect the Stage 3 repo before implementation and identify the narrow
integration points for Stage 4B.

## Teach-Back

- Concept: Preserve public contracts by changing only the backend internals and
  one new import endpoint.
- Intended code change: Governance notes only in this slice.
- Expected behavior: No runtime behavior change.
- Likely interview question: Where does Stage 4B attach without changing
  existing list/search/export responses?

## Findings

- `src/app.js` wires `/api` through API-version and auth middleware before
  mounting `src/routes/profiles.js`.
- `src/routes/profiles.js` owns the existing profile API surface:
  - `GET /api/profiles` validates query params and calls `repo.queryProfiles`.
  - `GET /api/profiles/search` parses deterministic keyword queries and calls
    `repo.queryProfiles`.
  - `GET /api/profiles/export` calls `repo.exportProfiles` and must remain
    uncached/shape-preserved.
  - `POST /api/profiles` and `DELETE /api/profiles/:id` are admin-only mutation
    points and must invalidate the query cache after successful changes.
- `src/repo/profiles.js` currently runs a two-query count/page flow in
  `queryProfiles`, which is the target for `COUNT(*) OVER()`.
- Migrations already include simple single-column indexes and a normalized-name
  unique index. Stage 4B will add only the allowed composite indexes.
- `src/db.js` creates a `pg` pool with default options; Stage 4B will expose
  env-backed pool tuning defaults.
- `src/lib/queryValidation.js` already canonicalizes direct HTTP list/export
  parameters. Stage 4B still needs deterministic normalization for parsed search
  filters, `country_ids`, `any` clauses, defaults, and object-key order before
  cache lookup.
- `src/services/queryParser.js` is deterministic and rule-based; no LLM or AI
  behavior is present or needed.
- CLI and web clients call the same existing backend routes with
  `Authorization` and `X-API-Version: 1`; no upload command or web upload UI
  should be added.
- Existing tests cover Stage 2/3 contracts, parser behavior, auth/RBAC,
  versioning, pagination links, CSV export, refresh rotation, and rate limiting.

## Exit Notes

- Changed files: `docs/stage4b-control-plane/task-packets/B4B-BASELINE-001.md`,
  roadmap/evidence/runtime status docs
- Tests run: Read-only inspection plus `git status --short --untracked-files=all`
- Evidence id: E-4B-002
- Operator defense: Explain that Stage 4B reads are intercepted below the
  existing route response shaping, while import is the only new route.
