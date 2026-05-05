const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { uuidv7 } = require('uuidv7');
const { createApp } = require('../src/app');
const { createAuthService } = require('../src/services/auth');
const { createFakeEnrich } = require('./helpers/fakeEnrich');
const { createMemoryAuthRepo } = require('./helpers/memoryAuthRepo');
const { createMemoryRepo } = require('./helpers/memoryRepo');

function csvBuffer(text) {
  return Buffer.from(text.replace(/\n/g, '\r\n'), 'utf8');
}

async function authApp(options = {}) {
  const authRepo = createMemoryAuthRepo();
  const repo = options.repo || createMemoryRepo();
  const authService = createAuthService({
    repo: authRepo,
    jwtSecret: 'test-secret',
    adminGithubUsernames: 'admin',
  });
  const admin = await authRepo.upsertGithubUser({ github_id: '1', username: 'admin' }, 'admin');
  const analyst = await authRepo.upsertGithubUser({ github_id: '2', username: 'analyst' }, 'analyst');
  const adminTokens = await authService.issueTokenPair(admin);
  const analystTokens = await authService.issueTokenPair(analyst);
  const app = createApp({
    authRepo,
    authService,
    enrichName: createFakeEnrich(),
    importBatchSize: options.importBatchSize,
    logger: () => {},
    repo,
  });
  return { adminTokens, analystTokens, app, repo };
}

function openApp(options = {}) {
  const repo = options.repo || createMemoryRepo();
  const app = createApp({
    authRequired: false,
    apiVersionRequired: false,
    enrichName: createFakeEnrich(),
    importBatchSize: options.importBatchSize,
    logger: () => {},
    repo,
  });
  return { app, repo };
}

function api(req, token) {
  return req.set('Authorization', `Bearer ${token}`).set('X-API-Version', '1');
}

function validProfile(name, overrides = {}) {
  return {
    id: uuidv7(),
    name,
    gender: overrides.gender || 'male',
    gender_probability: overrides.gender_probability || 0.9,
    age: overrides.age || 30,
    age_group: overrides.age_group || 'adult',
    country_id: overrides.country_id || 'NG',
    country_name: overrides.country_name || 'Nigeria',
    country_probability: overrides.country_probability || 0.8,
  };
}

test('route cache returns repeated list queries without a second repo hit', async () => {
  const { app, repo } = openApp();
  let queryCalls = 0;
  const queryProfiles = repo.queryProfiles.bind(repo);
  repo.queryProfiles = async (filters) => {
    queryCalls += 1;
    return queryProfiles(filters);
  };

  const first = await request(app).get('/api/profiles?gender=female');
  const second = await request(app).get('/api/profiles?gender=FEMALE&page=1&limit=10');

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(queryCalls, 1);
});

test('route cache returns repeated search queries without a second repo hit', async () => {
  const { app, repo } = openApp();
  await request(app).post('/api/profiles').send({ name: 'sarah' });

  let queryCalls = 0;
  const queryProfiles = repo.queryProfiles.bind(repo);
  repo.queryProfiles = async (filters) => {
    queryCalls += 1;
    return queryProfiles(filters);
  };

  const first = await request(app).get('/api/profiles/search?q=women%20from%20nigeria');
  const second = await request(app).get('/api/profiles/search?q=nigerian%20females');

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(queryCalls, 1);
});

test('create and delete invalidate cached profile queries', async () => {
  const { app, repo } = openApp();
  let queryCalls = 0;
  const queryProfiles = repo.queryProfiles.bind(repo);
  repo.queryProfiles = async (filters) => {
    queryCalls += 1;
    return queryProfiles(filters);
  };

  const empty = await request(app).get('/api/profiles');
  assert.equal(empty.body.total, 0);

  const created = await request(app).post('/api/profiles').send({ name: 'ella' });
  assert.equal(created.status, 201);
  const afterCreate = await request(app).get('/api/profiles');
  assert.equal(afterCreate.body.total, 1);

  const deleted = await request(app).delete(`/api/profiles/${created.body.data.id}`);
  assert.equal(deleted.status, 204);
  const afterDelete = await request(app).get('/api/profiles');
  assert.equal(afterDelete.body.total, 0);
  assert.equal(queryCalls, 3);
});

test('admin multipart CSV import succeeds and analyst upload returns 403', async () => {
  const { adminTokens, analystTokens, app } = await authApp();
  const csv = csvBuffer(`name,gender,age,country_id,gender_probability,country_probability
Ama,female,28,GH,0.9,0.8
`);

  const analyst = await api(request(app).post('/api/profiles/import'), analystTokens.access_token)
    .attach('file', csv, { filename: 'profiles.csv', contentType: 'text/csv' });
  assert.equal(analyst.status, 403);

  const admin = await api(request(app).post('/api/profiles/import'), adminTokens.access_token)
    .attach('file', csv, { filename: 'profiles.csv', contentType: 'text/csv' });
  assert.equal(admin.status, 200);
  assert.equal(admin.body.status, 'success');
  assert.equal(admin.body.total_rows, 1);
  assert.equal(admin.body.inserted, 1);
});

test('CSV import inserts valid rows in batches and invalidates cached queries', async () => {
  const { app, repo } = openApp({ importBatchSize: 2 });
  let queryCalls = 0;
  const queryProfiles = repo.queryProfiles.bind(repo);
  repo.queryProfiles = async (filters) => {
    queryCalls += 1;
    return queryProfiles(filters);
  };

  const before = await request(app).get('/api/profiles');
  assert.equal(before.body.total, 0);

  const csv = csvBuffer(`name,gender,age,country_id,gender_probability,country_probability
Amina,female,28,NG,0.9,0.8
Kofi,male,31,GH,0.9,0.8
Zola,female,22,ZA,0.9,0.8
Tari,male,40,NG,0.9,0.8
`);
  const imported = await request(app)
    .post('/api/profiles/import')
    .attach('file', csv, { filename: 'profiles.csv', contentType: 'text/csv' });

  assert.equal(imported.status, 200);
  assert.equal(imported.body.inserted, 4);
  assert.deepEqual(repo.batchInsertCalls(), [2, 2]);

  const after = await request(app).get('/api/profiles');
  assert.equal(after.body.total, 4);
  assert.equal(queryCalls, 2);
});

test('CSV import skips and counts bad rows without failing the upload', async () => {
  const { app, repo } = openApp({ importBatchSize: 2 });
  await repo.insertOrGet(validProfile('Existing'));

  const csv = csvBuffer(`name,gender,age,country_id,gender_probability,country_probability
Existing,male,30,NG,0.9,0.8
Alice,female,25,NG,0.9,0.8
Bob,male,-1,NG,0.9,0.8
Cara,unknown,20,NG,0.9,0.8
,male,20,NG,0.9,0.8
Alice,female,25,NG,0.9,0.8
Bad,row,with,too,many,columns,here
Dayo,male,41,GH,0.9,0.8
`);

  const res = await request(app)
    .post('/api/profiles/import')
    .attach('file', csv, { filename: 'profiles.csv', contentType: 'text/csv' });

  assert.equal(res.status, 200);
  assert.equal(res.body.total_rows, 8);
  assert.equal(res.body.inserted, 2);
  assert.equal(res.body.skipped, 6);
  assert.equal(res.body.reasons.duplicate_name, 2);
  assert.equal(res.body.reasons.invalid_age, 1);
  assert.equal(res.body.reasons.invalid_gender, 1);
  assert.equal(res.body.reasons.missing_fields, 1);
  assert.equal(res.body.reasons.malformed_row, 1);
});

test('concurrent CSV imports complete without duplicate inserts', async () => {
  const { app, repo } = openApp({ importBatchSize: 2 });
  const left = csvBuffer(`name,gender,age,country_id,gender_probability,country_probability
Race,male,30,NG,0.9,0.8
LeftOnly,female,25,GH,0.9,0.8
`);
  const right = csvBuffer(`name,gender,age,country_id,gender_probability,country_probability
Race,male,30,NG,0.9,0.8
RightOnly,male,33,ZA,0.9,0.8
`);

  const [first, second] = await Promise.all([
    request(app).post('/api/profiles/import').attach('file', left, { filename: 'left.csv', contentType: 'text/csv' }),
    request(app).post('/api/profiles/import').attach('file', right, { filename: 'right.csv', contentType: 'text/csv' }),
  ]);

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.inserted + second.body.inserted, 3);
  assert.equal(first.body.reasons.duplicate_name + second.body.reasons.duplicate_name, 1);
  assert.equal(repo.size(), 3);
});
