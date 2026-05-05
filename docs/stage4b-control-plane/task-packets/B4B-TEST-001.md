# B4B-TEST-001 - Stage 4B Tests And Verification

## Goal

Add focused Stage 4B tests and run required verification commands where the
local environment permits.

## Teach-Back

- Concept: Prove cache/import behavior directly while keeping Stage 3 regression
  tests in the same suite.
- Intended code change: Add cache/import tests, extend the memory repo batch
  helper, and update `npm test`.
- Expected behavior: Cache keys are canonical, repeated queries hit cache,
  mutations invalidate cache, import is admin-only and batch-based, and existing
  Stage 3 tests still pass.
- Likely interview question: Which tests prove Stage 3 behavior was preserved?

## Exit Notes

- Changed files: `test/queryCache.test.js`, `test/stage4b.test.js`,
  `test/helpers/memoryRepo.js`, `package.json`, `package-lock.json`,
  governance docs
- Tests run:
  - `npm install`
  - `npm run migrate` passed after Railway `DATABASE_URL` was provided
  - `npm run lint`
  - `npm test`
  - Local multipart import smoke test
  - Local repeated-query timing capture
- Evidence id: E-4B-007, E-4B-009
- Operator defense: Explain that the full backend suite now runs 69 tests,
  including existing Stage 3 auth/RBAC/versioning/pagination/export coverage and
  new Stage 4B cache/import coverage.
