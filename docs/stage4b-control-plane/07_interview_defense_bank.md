# Interview Defense Bank

## Scope

Q: Why did you add only one new endpoint?

A: The brief explicitly limits new backend surface area to admin-only
`POST /api/profiles/import`. Keeping CLI/web upload out of scope reduces
regression risk and preserves Stage 3 interfaces.

## Query Optimization

Q: Why use `COUNT(*) OVER()`?

A: It lets PostgreSQL return page rows and total count in one query for normal
non-empty pages, reducing one network round trip. A later empty page still needs
a separate count to preserve pagination correctness.

## Cache

Q: Why in-memory cache instead of Redis?

A: The user forbids Redis and new infrastructure. A bounded TTL/LRU process
cache directly addresses repeated queries while staying simple and disposable.

## Ingestion

Q: Why chunk inserts instead of one transaction?

A: The brief requires streaming/chunking and says rows inserted before a midway
failure should remain. Independent chunks keep memory bounded and avoid a single
large rollback surface.
