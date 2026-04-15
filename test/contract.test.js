const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryRepo } = require('./helpers/memoryRepo');
const { createFakeEnrich } = require('./helpers/fakeEnrich');

function newApp(fixtures) {
  const repo = createMemoryRepo();
  const enrichName = createFakeEnrich(fixtures);
  const app = createApp({ repo, enrichName });
  return { app, repo };
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// T-001
test('POST new profile returns 201 with full shape, UUID v7, ISO UTC', async () => {
  const { app } = newApp();
  const res = await request(app).post('/api/profiles').send({ name: 'ella' });
  assert.equal(res.status, 201);
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.equal(res.body.status, 'success');
  const d = res.body.data;
  assert.match(d.id, UUID_V7);
  assert.equal(d.name, 'ella');
  assert.equal(d.gender, 'female');
  assert.equal(d.age, 46);
  assert.equal(d.age_group, 'adult');
  assert.equal(d.country_id, 'DRC');
  assert.equal(d.sample_size, 1234);
  assert.match(d.created_at, ISO_Z);
});

// T-002, T-003, T-024
test('POST same name twice returns 200 and same id', async () => {
  const { app } = newApp();
  const first = await request(app).post('/api/profiles').send({ name: 'ella' });
  const dup = await request(app).post('/api/profiles').send({ name: 'ella' });
  assert.equal(first.status, 201);
  assert.equal(dup.status, 200);
  assert.equal(dup.body.message, 'Profile already exists');
  assert.equal(dup.body.data.id, first.body.data.id);
});

test('POST normalizes case and whitespace for idempotency', async () => {
  const { app, repo } = newApp();
  const a = await request(app).post('/api/profiles').send({ name: 'Ella' });
  const b = await request(app).post('/api/profiles').send({ name: '  ELLA  ' });
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(b.body.data.id, a.body.data.id);
  assert.equal(repo.size(), 1);
});

// T-004
test('POST with no body -> 400 Missing or empty name', async () => {
  const { app } = newApp();
  const res = await request(app).post('/api/profiles').send({});
  assert.equal(res.status, 400);
  assert.deepEqual(res.body, { status: 'error', message: 'Missing or empty name' });
});

// T-005
test('POST with whitespace name -> 400', async () => {
  const { app } = newApp();
  const res = await request(app).post('/api/profiles').send({ name: '   ' });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Missing or empty name');
});

// T-006
test('POST with non-string name -> 422 Invalid type', async () => {
  const { app } = newApp();
  for (const val of [123, true, [], {}]) {
    const res = await request(app).post('/api/profiles').send({ name: val });
    assert.equal(res.status, 422, `value=${JSON.stringify(val)}`);
    assert.deepEqual(res.body, { status: 'error', message: 'Invalid type' });
  }
});

// T-007/008/009/010
test('Upstream failures produce 502 with exact messages and no DB write', async () => {
  const { app, repo } = newApp({
    badgender: 'GENDERIZE_FAIL',
    badage: 'AGIFY_FAIL',
    badnat: 'NATIONALIZE_FAIL',
  });
  const r1 = await request(app).post('/api/profiles').send({ name: 'badgender' });
  const r2 = await request(app).post('/api/profiles').send({ name: 'badage' });
  const r3 = await request(app).post('/api/profiles').send({ name: 'badnat' });
  assert.equal(r1.status, 502);
  assert.equal(r1.body.message, 'Genderize returned an invalid response');
  assert.equal(r2.status, 502);
  assert.equal(r2.body.message, 'Agify returned an invalid response');
  assert.equal(r3.status, 502);
  assert.equal(r3.body.message, 'Nationalize returned an invalid response');
  assert.equal(repo.size(), 0);
});

// T-011
test('GET /api/profiles/{id} returns full shape', async () => {
  const { app } = newApp();
  const created = await request(app).post('/api/profiles').send({ name: 'emmanuel' });
  const got = await request(app).get(`/api/profiles/${created.body.data.id}`);
  assert.equal(got.status, 200);
  assert.equal(got.body.data.id, created.body.data.id);
  assert.equal(got.body.data.gender_probability, 0.98);
  assert.equal(got.body.data.country_probability, 0.85);
});

// T-012
test('GET /api/profiles/{id} unknown UUID -> 404', async () => {
  const { app } = newApp();
  const res = await request(app).get('/api/profiles/01860000-0000-7000-8000-000000000000');
  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { status: 'error', message: 'Profile not found' });
});

// T-013
test('GET malformed UUID -> 404', async () => {
  const { app } = newApp();
  const res = await request(app).get('/api/profiles/not-a-uuid');
  assert.equal(res.status, 404);
});

// T-014 / T-019
test('GET list has count, correct shape, only 6 fields per item', async () => {
  const { app } = newApp();
  await request(app).post('/api/profiles').send({ name: 'emmanuel' });
  await request(app).post('/api/profiles').send({ name: 'sarah' });
  const res = await request(app).get('/api/profiles');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.data.length, 2);
  for (const item of res.body.data) {
    assert.deepEqual(
      Object.keys(item).sort(),
      ['age', 'age_group', 'country_id', 'gender', 'id', 'name']
    );
  }
});

// T-015
test('Filter gender=MALE matches gender=male', async () => {
  const { app } = newApp();
  await request(app).post('/api/profiles').send({ name: 'emmanuel' });
  await request(app).post('/api/profiles').send({ name: 'sarah' });
  const upper = await request(app).get('/api/profiles?gender=MALE');
  const lower = await request(app).get('/api/profiles?gender=male');
  assert.equal(upper.body.count, 1);
  assert.deepEqual(upper.body.data, lower.body.data);
});

// T-016
test('Filter country_id case insensitive', async () => {
  const { app } = newApp();
  await request(app).post('/api/profiles').send({ name: 'emmanuel' });
  const a = await request(app).get('/api/profiles?country_id=ng');
  const b = await request(app).get('/api/profiles?country_id=NG');
  assert.equal(a.body.count, 1);
  assert.deepEqual(a.body.data, b.body.data);
});

// T-017
test('Filter age_group=ADULT = adult', async () => {
  const { app } = newApp();
  await request(app).post('/api/profiles').send({ name: 'emmanuel' });
  await request(app).post('/api/profiles').send({ name: 'liam' }); // child
  const a = await request(app).get('/api/profiles?age_group=ADULT');
  assert.equal(a.body.count, 1);
  assert.equal(a.body.data[0].name, 'emmanuel');
});

// T-018
test('Combined filters intersect', async () => {
  const { app } = newApp();
  await request(app).post('/api/profiles').send({ name: 'emmanuel' });
  await request(app).post('/api/profiles').send({ name: 'sarah' });
  const res = await request(app).get('/api/profiles?gender=female&country_id=US');
  assert.equal(res.body.count, 1);
  assert.equal(res.body.data[0].name, 'sarah');
});

// T-020
test('DELETE existing profile -> 204 and subsequent GET -> 404', async () => {
  const { app } = newApp();
  const created = await request(app).post('/api/profiles').send({ name: 'ella' });
  const id = created.body.data.id;
  const del = await request(app).delete(`/api/profiles/${id}`);
  assert.equal(del.status, 204);
  assert.equal(del.headers['access-control-allow-origin'], '*');
  assert.equal(del.text, '');
  const got = await request(app).get(`/api/profiles/${id}`);
  assert.equal(got.status, 404);
});

// T-021
test('DELETE missing/bad UUID -> 404', async () => {
  const { app } = newApp();
  const r1 = await request(app).delete('/api/profiles/bad-uuid');
  assert.equal(r1.status, 404);
  const r2 = await request(app).delete('/api/profiles/01860000-0000-7000-8000-000000000000');
  assert.equal(r2.status, 404);
});

// T-022
test('OPTIONS preflight -> 204 with CORS headers', async () => {
  const { app } = newApp();
  const res = await request(app).options('/api/profiles');
  assert.equal(res.status, 204);
  assert.equal(res.headers['access-control-allow-origin'], '*');
  assert.match(res.headers['access-control-allow-methods'], /POST/);
});

// T-023
test('CORS header present on error responses', async () => {
  const { app } = newApp();
  const res = await request(app).post('/api/profiles').send({});
  assert.equal(res.status, 400);
  assert.equal(res.headers['access-control-allow-origin'], '*');
});

// classification boundaries
test('age group classification boundaries', () => {
  const { ageGroup } = require('../src/services/classify');
  assert.equal(ageGroup(0), 'child');
  assert.equal(ageGroup(12), 'child');
  assert.equal(ageGroup(13), 'teenager');
  assert.equal(ageGroup(19), 'teenager');
  assert.equal(ageGroup(20), 'adult');
  assert.equal(ageGroup(59), 'adult');
  assert.equal(ageGroup(60), 'senior');
  assert.equal(ageGroup(120), 'senior');
});

test('top-probability country selection', () => {
  const { pickTopCountry } = require('../src/services/classify');
  const top = pickTopCountry([
    { country_id: 'US', probability: 0.3 },
    { country_id: 'NG', probability: 0.6 },
    { country_id: 'GB', probability: 0.1 },
  ]);
  assert.equal(top.country_id, 'NG');
  assert.equal(pickTopCountry([]), null);
});
