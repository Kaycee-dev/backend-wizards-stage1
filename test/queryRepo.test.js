const test = require('node:test');
const assert = require('node:assert/strict');
const { uuidv7 } = require('uuidv7');
const { setPool } = require('../src/db');
const repo = require('../src/repo/profiles');

function dbRow(overrides = {}) {
  return {
    total_count: overrides.total_count || 1,
    id: overrides.id || uuidv7(),
    name: overrides.name || 'Repo Test',
    gender: overrides.gender || 'female',
    gender_probability: overrides.gender_probability || 0.9,
    age: overrides.age || 30,
    age_group: overrides.age_group || 'adult',
    country_id: overrides.country_id || 'NG',
    country_name: overrides.country_name || 'Nigeria',
    country_probability: overrides.country_probability || 0.8,
    created_at: overrides.created_at || new Date(Date.UTC(2026, 0, 1)),
  };
}

test('queryProfiles uses one COUNT OVER query for non-empty pages', async () => {
  const calls = [];
  setPool({
    async query(text, params) {
      calls.push({ text, params });
      assert.match(text, /COUNT\(\*\) OVER\(\)::int AS total_count/);
      return { rows: [dbRow({ total_count: 7 })] };
    },
  });

  try {
    const result = await repo.queryProfiles({
      page: 1,
      limit: 10,
      sort_by: 'created_at',
      order: 'asc',
    });

    assert.equal(calls.length, 1);
    assert.equal(result.total, 7);
    assert.equal(result.data.length, 1);
  } finally {
    setPool(null);
  }
});

test('queryProfiles falls back to COUNT when a requested page returns no rows', async () => {
  const calls = [];
  setPool({
    async query(text, params) {
      calls.push({ text, params });
      if (calls.length === 1) {
        assert.match(text, /COUNT\(\*\) OVER\(\)::int AS total_count/);
        return { rows: [] };
      }
      assert.match(text, /SELECT COUNT\(\*\)::int AS total/);
      return { rows: [{ total: 12 }] };
    },
  });

  try {
    const result = await repo.queryProfiles({
      page: 4,
      limit: 10,
      sort_by: 'created_at',
      order: 'asc',
    });

    assert.equal(calls.length, 2);
    assert.equal(result.total, 12);
    assert.deepEqual(result.data, []);
  } finally {
    setPool(null);
  }
});
