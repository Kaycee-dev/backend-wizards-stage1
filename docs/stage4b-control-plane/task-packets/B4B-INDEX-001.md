# B4B-INDEX-001 - Composite Index Migration

## Goal

Add the Stage 4B optimization migration with only the allowed composite indexes.

## Teach-Back

- Concept: Match indexes to common equality and age-range filters.
- Intended code change: Add `migrations/004_stage4b_optimization.sql`.
- Expected behavior: The database can avoid broader scans for common country,
  gender, and age filter combinations after migration.
- Likely interview question: Why these indexes and not more?

## Exit Notes

- Changed files: `migrations/004_stage4b_optimization.sql`,
  governance decision/trace/evidence files
- Tests run: Not run in this slice; `npm run migrate` is part of final required
  verification.
- Evidence id: E-4B-003
- Operator defense: Explain that each index maps to a frequent demographic
  filter shape and that extra speculative indexes would slow imports.
