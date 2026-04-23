# Backend Wizards Stage 2 — Intelligence Query Engine

HNG14 Backend Wizards Stage 2 submission: a production-oriented profiles API
that supports advanced filtering, sorting, pagination, and rule-based natural
language search on a seeded demographic dataset.

## Stack

- Node.js 20+, Express 4
- PostgreSQL 16 via `pg`
- UUID v7 via `uuidv7`
- Tests: `node:test` + `supertest`

## Profile Schema

The `profiles` table is migrated to this public shape:

```json
{
  "id": "018f...",
  "name": "Ella Hassan",
  "gender": "female",
  "gender_probability": 0.99,
  "age": 46,
  "age_group": "adult",
  "country_id": "CD",
  "country_name": "DR Congo",
  "country_probability": 0.85,
  "created_at": "2026-04-20T12:00:00Z"
}
```

Names are unique after `lower(trim(name))` normalization. IDs are UUID v7.
Timestamps are returned as UTC ISO 8601 strings with `Z`.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/profiles` | Create a profile from upstream enrichment or return the existing normalized-name match |
| `GET` | `/api/profiles` | Advanced filtered list with sorting and pagination |
| `GET` | `/api/profiles/search` | Rule-based natural language search |
| `GET` | `/api/profiles/:id` | Fetch one profile |
| `DELETE` | `/api/profiles/:id` | Delete a profile |
| `GET` | `/` | Health check |

All responses include `Access-Control-Allow-Origin: *`.

## Query Features

### `GET /api/profiles`

Supported query parameters:

- `gender` → `male | female`
- `age_group` → `child | teenager | adult | senior`
- `country_id` → 2-letter ISO code
- `min_age`, `max_age`
- `min_gender_probability`, `min_country_probability`
- `sort_by` → `age | created_at | gender_probability`
- `order` → `asc | desc`
- `page` → default `1`
- `limit` → default `10`, max `50` (values above 50 are clamped to 50)

Example:

```bash
curl "http://localhost:3000/api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10"
```

Response shape:

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 42,
  "data": [{ "...": "profile row" }]
}
```

### `GET /api/profiles/search`

Supported query parameters:

- `q` → required natural language query
- `sort_by`, `order`, `page`, `limit`

Examples:

```bash
curl "http://localhost:3000/api/profiles/search?q=young%20males%20from%20nigeria"
curl "http://localhost:3000/api/profiles/search?q=females%20above%2030"
curl "http://localhost:3000/api/profiles/search?q=adult%20males%20from%20kenya"
```

Implemented rule-based mappings include:

- gender words: `male`, `female`, singular and plural variants
- age groups: `child`, `teenager`, `adult`, `senior`
- `young` → `min_age=16`, `max_age=24`
- age phrases such as `above 30`, `over 30`, `at least 30`, `below 20`, `under 20`
- country names resolved from the seeded country registry

If both male and female are present in the same query, the gender filter is
omitted and the remaining interpreted filters are applied.

## Errors

Errors always return:

```json
{ "status": "error", "message": "<error message>" }
```

Important cases:

| Case | Status | Message |
|------|--------|---------|
| Missing or empty `name` | `400` | `Missing or empty name` |
| `name` is not a string | `422` | `Invalid type` |
| Empty or missing required search/query parameter | `400` | `Invalid query parameters` |
| Invalid filter, sort, pagination, or malformed search parameter | `422` | `Invalid query parameters` |
| Uninterpretable natural-language query | `400` | `Unable to interpret query` |
| Unknown/malformed id | `404` | `Profile not found` |
| Invalid upstream response | `502` | `${Api} returned an invalid response` |
| Unhandled server failure | `500` | `Internal server error` |

On any `502`, no row is written.

## Seed Data

The API seeds PostgreSQL from the local [`seed_profiles.json`](./seed_profiles.json)
file containing 2,026 profiles.

- Seeding is idempotent.
- Re-running the seed does not create duplicate rows.
- Seed inserts use normalized-name conflict handling.
- The same seed file is also used to build the country registry for
  `country_name` backfill and natural-language country matching.

## Local Setup

```bash
cp .env.example .env
# set DATABASE_URL and optionally PORT

npm install
npm run migrate
npm run seed
npm start
```

Notes:

- `npm start` also attempts migrations and seeding automatically when
  `DATABASE_URL` is present.
- `npm run seed` is safe to rerun.

## Tests

```bash
npm test
```

The test suite covers:

- CRUD behavior with the Stage 2 profile shape
- advanced list filtering, sorting, pagination, and validation
- natural-language query parsing and `/api/profiles/search`
- UUID v7 and UTC timestamp formatting
- CORS behavior
- upstream enrichment behavior

Tests use an in-memory repo adapter, so they do not require PostgreSQL.

## Deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Deploy the service with `npm start`.
3. Confirm boot logs show migrations and seed completion.
4. Verify:

```bash
curl "https://<your-host>/api/profiles"
curl "https://<your-host>/api/profiles/search?q=young%20males%20from%20nigeria"
```

Before submission, replace these placeholders with your actual deployed values:

- API base URL: `https://<your-host>`
- Repository URL: `https://github.com/<your-user>/<your-repo>`
