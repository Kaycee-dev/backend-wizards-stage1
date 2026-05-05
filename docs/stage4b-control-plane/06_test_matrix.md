# Test Matrix

| Area | Required Coverage | Test Surface | Status | Evidence |
|---|---|---|---|---|
| Stage 3 regression | Existing auth, RBAC, versioning, pagination, export, parser, CLI/web untouched. | Existing `npm test`, targeted route tests. | Passed | E-4B-007 |
| Cache keys | Equivalent filters share keys; object order, `country_ids`, and `any` clauses are deterministic. | `test/queryCache.test.js`. | Passed | E-4B-007 |
| Cache behavior | Repeated list/search query hits repo once; create/delete/import invalidate cache. | `test/stage4b.test.js`. | Passed | E-4B-007 |
| Query repo | `COUNT(*) OVER()` path preserves totals; empty later pages fall back to count. | `test/queryRepo.test.js` with fake pool. | Passed | E-4B-007 |
| Import auth | Admin multipart CSV succeeds; analyst upload returns 403. | `test/stage4b.test.js`. | Passed | E-4B-007 |
| Import validation | Missing fields, invalid age, invalid gender, malformed rows, DB duplicates, upload duplicates are counted. | `test/stage4b.test.js`. | Passed | E-4B-007 |
| Import batching | Valid rows insert in batches, not row by row. | `test/stage4b.test.js` with batch-size spy. | Passed | E-4B-007 |
| Import concurrency | Concurrent uploads complete without duplicate inserts. | `test/stage4b.test.js`. | Passed | E-4B-007 |
| Required commands | `npm install`, `npm run migrate`, `npm run lint`, `npm test`, smoke upload, repeated-query timing. | Local command log plus Railway migration run. | Passed | E-4B-007, E-4B-009 |
