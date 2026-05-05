# B4B-IMPORT-001 - Streaming CSV Import

## Goal

Add the only new Stage 4B backend endpoint:
admin-only `POST /api/profiles/import` with multipart field `file`.

## Teach-Back

- Concept: Stream upload rows, validate candidates, and batch insert with
  idempotent conflict handling.
- Intended code change: Add import service, route, dependencies, and batch
  insert repository helper.
- Expected behavior: Bad rows are skipped and counted; valid rows are inserted
  in independent chunks; cache clears after every successful batch.
- Likely interview question: How are existing duplicates and race-condition
  duplicates counted?

## Exit Notes

- Changed files: `package.json`, `package-lock.json`,
  `src/services/profileImport.js`, `src/repo/profiles.js`,
  `src/routes/profiles.js`, governance docs
- Tests run: `npm install busboy csv-parse`; behavior tests pending in
  B4B-TEST-001
- Evidence id: E-4B-006
- Operator defense: Explain that duplicates within the same upload are caught by
  an in-memory normalized-name set, while DB/race duplicates are candidates not
  returned from `ON CONFLICT DO NOTHING RETURNING`.
