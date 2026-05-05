# Decisions Log

## D-4B-001 - Keep Stage 4B implementation in the Stage 3 repo only

- Date: `2026-05-05`
- Requirements: R-001, R-002, R-011
- Decision: Use the Stage 4A repo only as reference context and make all code,
  docs, tests, and `SOLUTION.md` changes in the Stage 3 repository.
- Alternatives considered:
  - Edit Stage 4A control-plane files. Rejected: the Stage 4B brief says Stage
    4A is complete and reference-only.
  - Create a separate implementation repo. Rejected: the user identified the
    Stage 3 repo as the primary implementation repo.
- Trade-off: Governance is duplicated in a smaller Stage 4B form, but this keeps
  the implementation auditable without touching Stage 4A.

## D-4B-002 - Use a lightweight control plane, not a large process rewrite

- Date: `2026-05-05`
- Requirements: R-001, R-011
- Decision: Track requirements, roadmap, teach-backs, decisions, evidence, tests,
  and interview defense in seven short files plus task packets.
- Alternatives considered:
  - No governance docs. Rejected: the user explicitly requires governance before
    implementation.
  - Heavy project-management structure. Rejected: Stage 4B is graded on working
    code and `SOLUTION.md`; process should support those artifacts, not bury
    them.
- Trade-off: The docs need upkeep during the task, but they provide a clear
  defense trail for implementation choices.

## D-4B-003 - Add only measured-query-shape composite indexes

- Date: `2026-05-05`
- Requirements: R-003, R-004
- Decision: Add exactly three composite indexes:
  `(country_id, gender, age)`, `(gender, age)`, and `(country_id, age)`.
- Alternatives considered:
  - Add many indexes for every filter and sort combination. Rejected: it would
    slow writes and batch imports without evidence that every combination is hot.
  - Rely only on existing single-column indexes. Rejected: common filters combine
    country or gender equality with age ranges, so composite indexes reduce heap
    work for those paths.
  - Add indexes involving probability fields. Rejected: the Stage 4B brief
    explicitly limits justified composite indexes to the three listed shapes.
- Trade-off: These indexes add write overhead during import, but the read-heavy
  workload and repeated demographic filters justify them.

## D-4B-004 - Use `COUNT(*) OVER()` with empty-page fallback

- Date: `2026-05-05`
- Requirements: R-004, R-001
- Decision: `queryProfiles` returns page rows and total count from one query
  using `COUNT(*) OVER()` when a page has rows, then runs a separate count only
  when the requested page returns no rows.
- Alternatives considered:
  - Keep the old count query before every page query. Rejected: it doubles
    normal read round trips to the remote database.
  - Remove totals from paginated responses. Rejected: Stage 3 response shapes
    require `total` and pagination links depend on it.
  - Return `total: 0` for empty later pages. Rejected: it breaks pagination
    correctness when rows exist on earlier pages.
- Trade-off: Empty pages still do two queries, but normal non-empty pages use
  one query and preserve the contract.

## D-4B-005 - Tune the existing `pg` pool with environment-backed defaults

- Date: `2026-05-05`
- Requirements: R-005, R-001
- Decision: Keep the existing `pg` pool and expose `PG_POOL_MAX`,
  `PG_IDLE_TIMEOUT_MS`, and `PG_CONNECTION_TIMEOUT_MS` with conservative
  fallbacks.
- Alternatives considered:
  - Add an external pooler. Rejected: the user forbids new infrastructure and
    the current repo already centralizes PostgreSQL access through `src/db.js`.
  - Hard-code larger pool values. Rejected: deployment capacity varies; env
    tuning is safer.
- Trade-off: Process-local pool tuning does not solve all connection pressure,
  but it improves operational control without changing architecture.

## D-4B-006 - Cache canonicalized profile query results in memory

- Date: `2026-05-05`
- Requirements: R-006, R-007, R-008, R-001
- Decision: Add a process-local TTL/LRU cache for successful `queryProfiles`
  results, keyed by canonical filter JSON rather than raw request text.
- Alternatives considered:
  - Redis or another shared cache. Rejected: the user explicitly forbids Redis
    and new infrastructure.
  - Cache raw query strings. Rejected: equivalent search phrases and object-key
    order would fragment the cache.
  - Cache exports. Rejected: exports can be larger and the brief requires query
    API response preservation, not CSV export caching.
- Trade-off: In-memory cache is per process and can be briefly stale until TTL
  or invalidation. The short 30-second default and mutation invalidation keep the
  correctness boundary simple.

## D-4B-007 - Stream CSV uploads and insert valid rows by independent batches

- Date: `2026-05-05`
- Requirements: R-002, R-008, R-009, R-010, R-001
- Decision: Add admin-only `POST /api/profiles/import` using Busboy for
  multipart streaming, `csv-parse` for CSV records, batch size 1000, and
  `INSERT ... ON CONFLICT DO NOTHING RETURNING` for valid candidates.
- Alternatives considered:
  - Parse the whole file into memory. Rejected: uploads can reach 500,000 rows.
  - Insert row by row. Rejected: explicitly forbidden and too slow.
  - Wrap the entire upload in one transaction. Rejected: the brief requires rows
    inserted before a midway failure to remain.
  - Add CLI or web upload UI. Rejected: the user explicitly limits Stage 4B to
    one backend upload endpoint.
- Trade-off: Independent chunks mean a later chunk failure does not roll back
  earlier chunks. That matches the brief, but operators need summary/error logs
  for any failed upload attempt.
