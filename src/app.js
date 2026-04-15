const express = require('express');
const { createRouter } = require('./routes/profiles');
const { error } = require('./lib/respond');
const { HttpError } = require('./lib/errors');

const PROFILE = {
  name: process.env.MY_NAME || 'Kelechi Uba',
  email: process.env.MY_EMAIL || 'odumosumatthew9@gmail.com',
  github_profile: process.env.MY_GITHUB || 'https://github.com/Kaycee-dev',
};

function commonHeaders(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Server', 'nginx');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}

function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(commonHeaders);
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Backend Wizards Stage 1 API',
      name: PROFILE.name,
      email: PROFILE.email,
      github_profile: PROFILE.github_profile,
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Service is healthy' });
  });

  app.get('/me', (req, res) => {
    res.status(200).json({
      status: 'success',
      name: PROFILE.name,
      email: PROFILE.email,
      github_profile: PROFILE.github_profile,
    });
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

module.exports = { createApp, PROFILE };
