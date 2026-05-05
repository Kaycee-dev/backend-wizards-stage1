# Insighta Labs+ Stage 4B Solution

## Summary

Stage 4B keeps the Stage 3 API, auth, RBAC, CLI, web portal, pagination, CSV
export, and existing list/search/export response shapes intact. The only new API
surface is:

```http
POST /api/profiles/import
Authorization: Bearer <token>
X-API-Version: 1
Content-Type: multipart/form-data
file field: file
```

The implementation improves three areas: PostgreSQL query efficiency,
deterministic query caching, and streaming CSV ingestion.

## Query Optimization

`migrations/004_stage4b_optimization.sql` adds exactly the requested composite
indexes:

| Index | Why it is justified |
|---|---|
| `(country_id, gender, age)` | Supports the most selective common demographic path: country + gender equality with age range filters. |
| `(gender, age)` | Supports gender-filtered age range searches when country is not present. |
| `(country_id, age)` | Supports country-filtered age range searches when gender is not present. |

Existing single-column indexes remain in place. I did not add speculative
probability or sort-specific composite indexes because every index slows imports
and the brief only allows justified composite indexes.

`src/repo/profiles.js` now uses `COUNT(*) OVER()` in `queryProfiles`. Normal
non-empty pages return page rows and total count in one database round trip. If a
requested page returns no rows, the code runs a fallback count query so later
empty pages still return the correct `total` and pagination metadata.

`src/db.js` keeps the existing `pg` pool and adds environment-backed defaults:

| Env var | Default |
|---|---:|
| `PG_POOL_MAX` | `10` |
| `PG_IDLE_TIMEOUT_MS` | `30000` |
| `PG_CONNECTION_TIMEOUT_MS` | `5000` |

## Query Normalization And Cache

`src/lib/queryCache.js` adds a small in-memory TTL/LRU cache for successful
profile list/search results only. CSV export is not cached.

Defaults:

| Env var | Default |
|---|---:|
| `PROFILE_QUERY_CACHE_TTL_MS` | `30000` |
| `PROFILE_QUERY_CACHE_MAX_ENTRIES` | `500` |

Cache keys are built from canonical filter objects after validation/parsing, not
from raw request text. The normalizer canonicalizes:

- default `page`, `limit`, `sort_by`, and `order`
- gender, age group, and country casing
- numeric values
- sorted and deduplicated `country_ids`
- sorted object keys
- order-independent `any` OR clauses

Cache invalidation happens after successful profile create, delete, and every
successful CSV import batch.

## CSV Ingestion

`POST /api/profiles/import` is admin-only through the existing `/api` auth,
RBAC, and `X-API-Version: 1` middleware. It uses Busboy for multipart streaming
and `csv-parse` for CSV records.

Required CSV columns:

- `name`
- `gender`
- `age`
- `country_id`
- `gender_probability`
- `country_probability`

For each valid row, the importer derives `age_group` from `age` and
`country_name` from the existing country registry. Valid candidates are inserted
in chunks of 1000 with one batch statement:

```sql
INSERT INTO profiles (...) VALUES (...)
ON CONFLICT ((LOWER(BTRIM(name)))) DO NOTHING
RETURNING ...
```

The upload is not wrapped in one transaction. Each chunk inserts independently,
so rows inserted before a later failure remain, as required.

Skipped rows are counted under:

- `duplicate_name`
- `invalid_age`
- `missing_fields`
- `invalid_gender`
- `malformed_row`

Duplicate names are counted from duplicates already in the database,
duplicates within the same upload, and race-condition conflicts after insert.
The response shape is:

```json
{
  "status": "success",
  "total_rows": 1,
  "inserted": 1,
  "skipped": 0,
  "reasons": {
    "duplicate_name": 0,
    "invalid_age": 0,
    "missing_fields": 0,
    "invalid_gender": 0,
    "malformed_row": 0
  }
}
```

## Edge Cases

- Missing multipart `file` field returns an error.
- Analyst import attempts return `403`.
- Wrong column counts or CSV parser skips are counted as `malformed_row`.
- Empty required values are counted as `missing_fields`.
- Negative or non-integer ages are counted as `invalid_age`.
- Unsupported genders are counted as `invalid_gender`.
- Invalid countries or probability values are counted as `malformed_row`.
- One bad row does not fail the whole upload.
- Concurrent uploads rely on the existing normalized-name unique index and
  `ON CONFLICT DO NOTHING` to prevent duplicate inserts.

## Trade-Offs And Limitations

- The cache is process-local. It avoids new infrastructure and meets the brief,
  but multiple app instances would not share entries.
- Cached reads can be briefly stale inside the TTL if another process writes.
  In this repo's single-process shape, create/delete/import clear the cache.
- Composite indexes improve read paths but add write overhead during imports.
- The importer keeps a normalized-name set for the current upload to count
  duplicate-in-file rows. That is memory bounded by unique names in the upload,
  not by full row payloads.
- True database latency must be measured with a configured `DATABASE_URL` and a
  representative dataset. I did not invent production numbers.

## Measurements And Verification

Commands run locally:

| Command | Result |
|---|---|
| `npm install` | Passed, 0 vulnerabilities |
| `npm run migrate` | Passed after `DATABASE_URL` was provided; applied `001_init.sql` through `004_stage4b_optimization.sql` |
| `npm run lint` | Passed |
| `npm test` | Passed, 69/69 tests |
| Local multipart smoke | Passed: inserted 1 row |
| Local repeated-query timing | Cold `56.928 ms`, cached `24.331 ms` against in-memory app with 200 seeded rows |
| Railway read-only query timing | 2,030 `profiles` rows; old two-query flow avg `712.066 ms`; new `COUNT(*) OVER()` query avg `369.014 ms` across five runs |

The timing above proves the local cache path, not production database latency.
The Railway timing is a small read-only database measurement against the provided
database, not a full production benchmark. To reproduce before/after PostgreSQL
measurements against the same database and dataset, run:

```powershell
$env:DATABASE_URL = "<postgres-url>"
npm run migrate

$headers = @{
  Authorization = "Bearer $env:INSIGHTA_TOKEN"
  "X-API-Version" = "1"
}

1..10 | ForEach-Object {
  Measure-Command {
    Invoke-RestMethod `
      -Headers $headers `
      "$env:INSIGHTA_API_URL/api/profiles?gender=female&country_id=NG&min_age=20&max_age=45&page=1&limit=10" `
      | Out-Null
  } | Select-Object TotalMilliseconds
}
```

Manual import smoke against a live server:

```powershell
@"
name,gender,age,country_id,gender_probability,country_probability
Smoke User,female,29,NG,0.91,0.84
"@ | Set-Content -Encoding UTF8 smoke_profiles.csv

curl.exe -X POST "$env:INSIGHTA_API_URL/api/profiles/import" `
  -H "Authorization: Bearer $env:INSIGHTA_TOKEN" `
  -H "X-API-Version: 1" `
  -F "file=@smoke_profiles.csv;type=text/csv"
```

## Stage 3 Compatibility

The existing Stage 3 backend suite remains in `npm test` and still passes. The
implementation does not add CLI upload behavior or web upload UI, and it does
not change response shapes for:

- `GET /api/profiles`
- `GET /api/profiles/search`
- `GET /api/profiles/export`
