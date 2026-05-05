const Busboy = require('busboy');
const { parse } = require('csv-parse');
const { uuidv7 } = require('uuidv7');
const { HttpError } = require('../lib/errors');
const { getCountryName } = require('../lib/countries');
const {
  VALID_GENDERS,
  normalizeCountryId,
  normalizeGender,
  normalizeName,
  normalizeNameKey,
} = require('../lib/profiles');
const { ageGroup } = require('./classify');

const REQUIRED_COLUMNS = [
  'name',
  'gender',
  'age',
  'country_id',
  'gender_probability',
  'country_probability',
];

const DEFAULT_BATCH_SIZE = 1000;

function createSummary() {
  return {
    total_rows: 0,
    inserted: 0,
    reasons: {
      duplicate_name: 0,
      invalid_age: 0,
      missing_fields: 0,
      invalid_gender: 0,
      malformed_row: 0,
    },
  };
}

function skippedCount(summary) {
  return Object.values(summary.reasons).reduce((total, count) => total + count, 0);
}

function finalSummary(summary) {
  return {
    total_rows: summary.total_rows,
    inserted: summary.inserted,
    skipped: skippedCount(summary),
    reasons: summary.reasons,
  };
}

function hasMissingFields(row) {
  return REQUIRED_COLUMNS.some((column) => {
    const value = row[column];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

function parseAge(value) {
  if (!/^\d+$/.test(String(value).trim())) return null;
  const age = Number(value);
  if (!Number.isInteger(age) || age < 0) return null;
  return age;
}

function parseProbability(value) {
  const probability = Number(String(value).trim());
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    return null;
  }
  return probability;
}

function validateRow(row, seenNames, summary) {
  if (!row || typeof row !== 'object') {
    summary.reasons.malformed_row += 1;
    return null;
  }
  if (hasMissingFields(row)) {
    summary.reasons.missing_fields += 1;
    return null;
  }

  const name = normalizeName(row.name);
  const nameKey = normalizeNameKey(name);
  if (!nameKey) {
    summary.reasons.missing_fields += 1;
    return null;
  }
  if (seenNames.has(nameKey)) {
    summary.reasons.duplicate_name += 1;
    return null;
  }

  const gender = normalizeGender(row.gender);
  if (!VALID_GENDERS.has(gender)) {
    summary.reasons.invalid_gender += 1;
    return null;
  }

  const age = parseAge(row.age);
  if (age === null) {
    summary.reasons.invalid_age += 1;
    return null;
  }

  const countryId = normalizeCountryId(row.country_id);
  const countryName = /^[A-Z]{2}$/.test(countryId) ? getCountryName(countryId) : null;
  if (!countryName) {
    summary.reasons.malformed_row += 1;
    return null;
  }

  const genderProbability = parseProbability(row.gender_probability);
  const countryProbability = parseProbability(row.country_probability);
  if (genderProbability === null || countryProbability === null) {
    summary.reasons.malformed_row += 1;
    return null;
  }

  seenNames.add(nameKey);
  return {
    id: uuidv7(),
    name,
    gender,
    gender_probability: genderProbability,
    age,
    age_group: ageGroup(age),
    country_id: countryId,
    country_name: countryName,
    country_probability: countryProbability,
  };
}

async function importProfilesFromCsvStream(stream, options = {}) {
  const repo = options.repo;
  if (!repo || typeof repo.insertManyIgnoreDuplicates !== 'function') {
    throw new Error('Profile import requires repo.insertManyIgnoreDuplicates');
  }
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const onBatchComplete = options.onBatchComplete || (() => {});
  const summary = createSummary();
  const seenNames = new Set();
  const batch = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    const candidates = batch.splice(0, batch.length);
    const insertedRows = await repo.insertManyIgnoreDuplicates(candidates);
    const inserted = insertedRows.length;
    summary.inserted += inserted;
    summary.reasons.duplicate_name += candidates.length - inserted;
    await onBatchComplete();
  }

  const parser = parse({
    bom: true,
    columns: true,
    skip_empty_lines: true,
    skip_records_with_error: true,
    trim: true,
    on_skip: () => {
      summary.total_rows += 1;
      summary.reasons.malformed_row += 1;
    },
  });

  stream.pipe(parser);

  for await (const row of parser) {
    summary.total_rows += 1;
    const candidate = validateRow(row, seenNames, summary);
    if (!candidate) continue;
    batch.push(candidate);
    if (batch.length >= batchSize) {
      await flushBatch();
    }
  }

  await flushBatch();
  return finalSummary(summary);
}

function importProfilesFromMultipart(req, options = {}) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    throw new HttpError(400, 'Content-Type must be multipart/form-data');
  }

  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({ headers: req.headers, limits: { files: 1 } });
    } catch (err) {
      reject(err);
      return;
    }

    let fileSeen = false;
    let importPromise = null;

    busboy.on('file', (fieldname, file) => {
      if (fieldname !== 'file' || fileSeen) {
        file.resume();
        return;
      }
      fileSeen = true;
      importPromise = importProfilesFromCsvStream(file, options);
    });

    busboy.on('error', reject);
    busboy.on('finish', async () => {
      if (!fileSeen) {
        reject(new HttpError(400, 'CSV file is required'));
        return;
      }
      try {
        resolve(await importPromise);
      } catch (err) {
        reject(err);
      }
    });

    req.pipe(busboy);
  });
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  REQUIRED_COLUMNS,
  importProfilesFromCsvStream,
  importProfilesFromMultipart,
  validateRow,
};
