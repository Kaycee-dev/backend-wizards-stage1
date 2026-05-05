const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createProfileQueryCache,
  normalizeProfileQueryFilters,
  profileQueryCacheKey,
} = require('../src/lib/queryCache');
const { parseNaturalLanguageQuery } = require('../src/services/queryParser');

test('canonical cache keys match equivalent parsed filters from different phrasing', () => {
  const first = {
    page: 1,
    limit: 10,
    ...parseNaturalLanguageQuery('nigerian women aged 20 to 45'),
  };
  const second = {
    ...parseNaturalLanguageQuery('females from nigeria between 20 and 45'),
    order: 'asc',
    sort_by: 'created_at',
  };

  assert.equal(profileQueryCacheKey(first), profileQueryCacheKey(second));
});

test('canonical cache keys ignore object key order and normalize casing and numbers', () => {
  const first = {
    gender: 'Female',
    country_id: 'ng',
    min_age: '20',
    max_age: 45,
    limit: '10',
    page: '1',
  };
  const second = {
    page: 1,
    max_age: '45',
    country_id: 'NG',
    gender: 'female',
    min_age: 20,
    limit: 10,
  };

  assert.equal(profileQueryCacheKey(first), profileQueryCacheKey(second));
  assert.deepEqual(Object.keys(normalizeProfileQueryFilters(first)), [
    'country_id',
    'gender',
    'limit',
    'max_age',
    'min_age',
    'order',
    'page',
    'sort_by',
  ]);
});

test('country_ids and any clauses are deterministic and order-independent', () => {
  const first = {
    any: [
      { gender: 'male', country_ids: ['gh', 'AO'], min_age: '30' },
      { gender: 'female', country_ids: ['NG', 'ke'], max_age: 35 },
    ],
  };
  const second = {
    any: [
      { country_ids: ['KE', 'ng'], max_age: '35', gender: 'FEMALE' },
      { min_age: 30, country_ids: ['AO', 'GH'], gender: 'male' },
    ],
  };

  assert.equal(profileQueryCacheKey(first), profileQueryCacheKey(second));
});

test('profile query cache applies TTL and LRU limits', () => {
  let now = 1000;
  const cache = createProfileQueryCache({
    maxEntries: 2,
    ttlMs: 50,
    now: () => now,
  });

  cache.set('a', { data: [1] });
  cache.set('b', { data: [2] });
  assert.deepEqual(cache.get('a'), { data: [1] });
  cache.set('c', { data: [3] });

  assert.equal(cache.get('b'), null);
  assert.deepEqual(cache.get('a'), { data: [1] });
  now = 1100;
  assert.equal(cache.get('a'), null);
});
