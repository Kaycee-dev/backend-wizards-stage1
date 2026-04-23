const express = require('express');
const { createRouter } = require('./routes/profiles');
const { error } = require('./lib/respond');
const { HttpError } = require('./lib/errors');

function cors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}

function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors);
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Backend Wizards Stage 2 - Intelligence Query Engine' });
  });

  app.use('/api/profiles', createRouter(options));

  app.use((req, res) => {
    error(res, 404, 'Profile not found');
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return error(res, 400, 'Missing or empty name');
    }
    if (err instanceof HttpError) {
      return error(res, err.status, err.message);
    }
    console.error('[unhandled]', err);
    return error(res, 500, 'Internal server error');
  });

  return app;
}

module.exports = { createApp };
