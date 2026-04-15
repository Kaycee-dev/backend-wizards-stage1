const express = require('express');
const { uuidv7 } = require('uuidv7');
const { enrichName: defaultEnrich } = require('../services/external');
const { ageGroup } = require('../services/classify');
const defaultRepo = require('../repo/profiles');
const { success, error } = require('../lib/respond');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createRouter({ repo = defaultRepo, enrichName = defaultEnrich } = {}) {
  const router = express.Router();

  router.post('/', async (req, res, next) => {
    try {
      const body = req.body || {};
      if (!('name' in body) || body.name === null || body.name === undefined) {
        return error(res, 400, 'Missing or empty name');
      }
      if (typeof body.name !== 'string') {
        return error(res, 422, 'Invalid type');
      }
      const trimmed = body.name.trim();
      if (trimmed.length === 0) {
        return error(res, 400, 'Missing or empty name');
      }

      const name_key = trimmed.toLowerCase();
      const enriched = await enrichName(trimmed);
      const profile = {
        id: uuidv7(),
        name: trimmed,
        name_key,
        gender: enriched.gender,
        gender_probability: enriched.gender_probability,
        sample_size: enriched.sample_size,
        age: enriched.age,
        age_group: ageGroup(enriched.age),
        country_id: enriched.country_id,
        country_probability: enriched.country_probability,
      };

      const { inserted, row } = await repo.insertOrGet(profile);
      if (inserted) {
        return success(res, 201, { data: row });
      }
      return success(res, 200, { message: 'Profile already exists', data: row });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const { gender, country_id, age_group } = req.query;
      const data = await repo.list({ gender, country_id, age_group });
      return success(res, 200, { count: data.length, data });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!UUID_RE.test(id)) return error(res, 404, 'Profile not found');
      const row = await repo.findById(id);
      if (!row) return error(res, 404, 'Profile not found');
      return success(res, 200, { data: row });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!UUID_RE.test(id)) return error(res, 404, 'Profile not found');
      const ok = await repo.deleteById(id);
      if (!ok) return error(res, 404, 'Profile not found');
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createRouter };
