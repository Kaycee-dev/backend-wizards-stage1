# Requirements Trace

| ID | Requirement | Implementation Surface | Evidence |
|---|---|---|---|
| R-001 | Preserve Stage 3 behavior for auth, RBAC, CLI, web, API versioning, pagination, CSV export, and existing response shapes. | Existing routes/tests plus regression verification. | Pending |
| R-002 | Add only `POST /api/profiles/import`, admin-only, same bearer auth and `X-API-Version: 1`, multipart `file` field. | `src/routes/profiles.js`, `src/services/profileImport.js`. | E-4B-006 |
| R-003 | Add justified composite indexes only: `(country_id, gender, age)`, `(gender, age)`, `(country_id, age)`. | `migrations/004_stage4b_optimization.sql`. | E-4B-003 |
| R-004 | Avoid normal two-query count/page flow where safe using `COUNT(*) OVER()`, with empty later-page count fallback. | `src/repo/profiles.js`. | E-4B-004 |
| R-005 | Expose pool tuning defaults via `PG_POOL_MAX`, `PG_IDLE_TIMEOUT_MS`, and `PG_CONNECTION_TIMEOUT_MS`. | `src/db.js`. | E-4B-004 |
| R-006 | Normalize parsed/validated filters deterministically before cache lookup. | `src/lib/queryCache.js`. | E-4B-005 |
| R-007 | Cache successful profile list/search query results only with TTL 30s and max 500 entries, env-overridable. | `src/lib/queryCache.js`, `src/routes/profiles.js`. | E-4B-005 |
| R-008 | Clear cache after create, delete, and every successful CSV import batch. | `src/routes/profiles.js`. | E-4B-006 |
| R-009 | Stream CSV imports, validate rows, derive `age_group` and `country_name`, batch valid inserts in chunks of 1000, no full-upload transaction. | `src/services/profileImport.js`, `src/repo/profiles.js`. | E-4B-006 |
| R-010 | Count skipped rows by duplicate name, invalid age, missing fields, invalid gender, malformed row, and related validation failures. | `src/services/profileImport.js`. | E-4B-006 |
| R-011 | Include `SOLUTION.md` with approach, indexes, query fallback, cache, ingestion, edge cases, trade-offs, and measurements or exact measurement commands. | `SOLUTION.md`. | E-4B-008 |
