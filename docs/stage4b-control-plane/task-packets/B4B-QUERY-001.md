# B4B-QUERY-001 - Query Path Optimization

## Goal

Reduce normal profile list/search query round trips while preserving Stage 3
pagination behavior.

## Teach-Back

- Concept: Use a window count to return page rows and total in one query.
- Intended code change: Update `src/repo/profiles.js` and pool defaults in
  `src/db.js`.
- Expected behavior: Non-empty pages avoid the old count-before-page round trip;
  empty pages still report the correct total by using a fallback count.
- Likely interview question: Why does an empty later page still need a count?

## Exit Notes

- Changed files: `src/repo/profiles.js`, `src/db.js`, governance docs
- Tests run: Pending in B4B-TEST-001
- Evidence id: E-4B-004
- Operator defense: Explain that `COUNT(*) OVER()` cannot produce a total when
  no rows are returned, so the fallback is required for pagination correctness.
