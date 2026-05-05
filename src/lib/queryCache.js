function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortObject(value[key]);
  }
  return sorted;
}

function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

function normalizeString(value, transform = (v) => v) {
  if (value === undefined || value === null) return undefined;
  const normalized = transform(String(value).trim());
  return normalized === '' ? undefined : normalized;
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function setIfDefined(target, key, value) {
  if (value !== undefined) {
    target[key] = value;
  }
}

function normalizeCountryIds(value) {
  if (!Array.isArray(value)) return undefined;
  const ids = value
    .map((item) => normalizeString(item, (v) => v.toUpperCase()))
    .filter(Boolean);
  return [...new Set(ids)].sort();
}

function normalizeAnyClauses(value) {
  if (!Array.isArray(value)) return undefined;
  const byKey = new Map();
  for (const clause of value) {
    const normalized = normalizeProfileQueryFilters(clause, { includeDefaults: false });
    if (Object.keys(normalized).length === 0) continue;
    byKey.set(stableStringify(normalized), normalized);
  }
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map((entry) => entry[1]);
}

function normalizeProfileQueryFilters(filters = {}, options = {}) {
  const includeDefaults = options.includeDefaults !== false;
  const normalized = {};

  if (includeDefaults) {
    normalized.limit = normalizeNumber(filters.limit) || 10;
    normalized.order = normalizeString(filters.order, (v) => v.toLowerCase()) || 'asc';
    normalized.page = normalizeNumber(filters.page) || 1;
    normalized.sort_by = normalizeString(filters.sort_by, (v) => v.toLowerCase()) || 'created_at';
  } else {
    setIfDefined(normalized, 'order', normalizeString(filters.order, (v) => v.toLowerCase()));
    setIfDefined(normalized, 'sort_by', normalizeString(filters.sort_by, (v) => v.toLowerCase()));
  }

  setIfDefined(normalized, 'age_group', normalizeString(filters.age_group, (v) => v.toLowerCase()));
  setIfDefined(normalized, 'country_id', normalizeString(filters.country_id, (v) => v.toUpperCase()));
  setIfDefined(normalized, 'gender', normalizeString(filters.gender, (v) => v.toLowerCase()));
  setIfDefined(normalized, 'max_age', normalizeNumber(filters.max_age));
  setIfDefined(normalized, 'min_age', normalizeNumber(filters.min_age));
  setIfDefined(normalized, 'min_country_probability', normalizeNumber(filters.min_country_probability));
  setIfDefined(normalized, 'min_gender_probability', normalizeNumber(filters.min_gender_probability));

  const countryIds = normalizeCountryIds(filters.country_ids);
  if (countryIds && countryIds.length === 1 && !normalized.country_id) {
    normalized.country_id = countryIds[0];
  } else if (countryIds && countryIds.length > 0) {
    normalized.country_ids = countryIds;
  }

  const any = normalizeAnyClauses(filters.any);
  if (any && any.length > 0) {
    normalized.any = any;
  }

  return sortObject(normalized);
}

function profileQueryCacheKey(filters) {
  return stableStringify(normalizeProfileQueryFilters(filters));
}

function createProfileQueryCache(options = {}) {
  const ttlMs = options.ttlMs || readPositiveIntegerEnv('PROFILE_QUERY_CACHE_TTL_MS', 30_000);
  const maxEntries = options.maxEntries || readPositiveIntegerEnv('PROFILE_QUERY_CACHE_MAX_ENTRIES', 500);
  const now = options.now || (() => Date.now());
  const entries = new Map();
  let hits = 0;
  let misses = 0;

  function get(key) {
    const entry = entries.get(key);
    if (!entry) {
      misses += 1;
      return null;
    }
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      misses += 1;
      return null;
    }
    entries.delete(key);
    entries.set(key, entry);
    hits += 1;
    return clone(entry.value);
  }

  function set(key, value) {
    entries.delete(key);
    entries.set(key, {
      value: clone(value),
      expiresAt: now() + ttlMs,
    });
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      entries.delete(oldest);
    }
  }

  function clear() {
    entries.clear();
  }

  function stats() {
    return { entries: entries.size, hits, misses, maxEntries, ttlMs };
  }

  return { clear, get, set, stats };
}

async function queryProfilesWithCache(repo, cache, filters) {
  const key = profileQueryCacheKey(filters);
  const cached = cache.get(key);
  if (cached) return cached;
  const result = await repo.queryProfiles(filters);
  cache.set(key, result);
  return clone(result);
}

module.exports = {
  createProfileQueryCache,
  normalizeProfileQueryFilters,
  profileQueryCacheKey,
  queryProfilesWithCache,
  stableStringify,
};
