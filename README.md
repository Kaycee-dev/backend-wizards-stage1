# Backend Wizards Stage 1 — Profiles API

HNG14 Backend Wizards Stage 1 submission: a public profiles API that enriches a
name with Genderize, Agify, and Nationalize data and persists it in PostgreSQL.

## Stack

- Node.js 20+, Express 4
- PostgreSQL 16 (via `pg`)
- UUID v7 via `uuidv7`
- Tests: `node:test` + `supertest`

## Endpoints

| Method | Path                 | Purpose |
|--------|----------------------|---------|
| POST   | `/api/profiles`      | Create (or return existing) profile |
| GET    | `/api/profiles/:id`  | Fetch one profile |
| GET    | `/api/profiles`      | List with optional `gender`, `country_id`, `age_group` filters |
| DELETE | `/api/profiles/:id`  | Delete by id |
| GET    | `/`                  | Health check |

All responses carry `Access-Control-Allow-Origin: *`. Errors use
`{ "status": "error", "message": "..." }`. Success uses
`{ "status": "success", ... }`. Timestamps are ISO 8601 UTC with `Z`.

### POST example

```bash
curl -i -X POST https://<host>/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"ella"}'
```

Fresh creation → `201`:

```json
{
  "status": "success",
  "data": {
    "id": "018f...",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-15T12:00:00Z"
  }
}
```

Duplicate (normalized via `lower(trim(name))`) → `200`:

```json
{ "status": "success", "message": "Profile already exists", "data": { ... } }
```

### Error codes

| Case                                        | Status | Message |
|---------------------------------------------|--------|---------|
| Missing or empty `name`                     | 400    | `Missing or empty name` |
| `name` is not a string                      | 422    | `Invalid type` |
| Unknown/malformed id, or deleted profile    | 404    | `Profile not found` |
| Any upstream returns invalid payload        | 502    | `${Api} returned an invalid response` |
| Unhandled server error                      | 500    | `Internal server error` |

On any 502, **no row is written** to the database.

## Local setup

```bash
cp .env.example .env        # set DATABASE_URL to your Postgres URL
npm install
npm run migrate             # applies migrations/001_init.sql
npm start                   # listens on $PORT (default 3000)
```

## Tests

```bash
npm test
```

Covers:

- POST create, duplicate-by-case/whitespace, exact idempotency
- 400 / 422 validation paths
- 502 for each upstream, with zero DB writes
- GET by id (found / unknown / malformed)
- GET list filters (case-insensitive, combined)
- List-item field shape (only `id,name,gender,age,age_group,country_id`)
- DELETE → 204 → subsequent GET → 404
- CORS on success, error, 204, and OPTIONS preflight
- UUID v7 version nibble, ISO-8601 UTC `Z` timestamps
- Upstream parallelism (Promise.all), top-probability country selection

The test suite stubs the three upstreams and uses an in-memory repo adapter so
you can run `npm test` without a Postgres instance.

## Deployment (Railway)

1. Create a Railway project, provision Postgres, copy `DATABASE_URL`.
2. Add a new service from the GitHub repo.
3. Set env vars: `DATABASE_URL`, `PORT=3000`.
4. Start command: `npm start` (runs migrations automatically at boot).
5. Verify:

```bash
curl -i https://<host>/api/profiles -H "Content-Type: application/json" -d '{"name":"ella"}'
```

Confirm `Access-Control-Allow-Origin: *`, UUID v7 id, and `created_at` ending in `Z`.

## Submission

- API base URL: https://backend-wizards-stage1-production-c5c1.up.railway.app
- Repo URL: https://github.com/Kaycee-dev/backend-wizards-stage1.git
