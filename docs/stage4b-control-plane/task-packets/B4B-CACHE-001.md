# B4B-CACHE-001 - Query Normalization And Cache

## Goal

Normalize profile query filters before lookup and cache successful list/search
results in a bounded in-memory TTL/LRU cache.

## Teach-Back

- Concept: Cache by canonical filter object, not raw query text or raw object
  insertion order.
- Intended code change: Add `src/lib/queryCache.js` and route list/search
  through it.
- Expected behavior: Equivalent filters share keys; create/delete invalidate
  cached profile query results.
- Likely interview question: How do equivalent natural-language queries reuse
  the same cache entry?

## Exit Notes

- Changed files: `src/lib/queryCache.js`, `src/routes/profiles.js`,
  governance docs
- Tests run: Pending in B4B-TEST-001
- Evidence id: E-4B-005
- Operator defense: Explain normalization of defaults, casing, numeric values,
  sorted `country_ids`, sorted object keys, and order-independent `any` clauses.
