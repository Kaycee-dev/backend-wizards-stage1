const { Pool } = require('pg');

let pool = null;

function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

function poolOptions(connectionString, ssl) {
  return {
    connectionString,
    ssl,
    max: readPositiveIntegerEnv('PG_POOL_MAX', 10),
    idleTimeoutMillis: readPositiveIntegerEnv('PG_IDLE_TIMEOUT_MS', 30_000),
    connectionTimeoutMillis: readPositiveIntegerEnv('PG_CONNECTION_TIMEOUT_MS', 5_000),
  };
}

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const ssl = /sslmode=require/i.test(connectionString) || process.env.PGSSL === 'true'
    ? { rejectUnauthorized: false }
    : false;
  pool = new Pool(poolOptions(connectionString, ssl));
  return pool;
}

function setPool(p) {
  pool = p;
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, poolOptions, setPool, query };
