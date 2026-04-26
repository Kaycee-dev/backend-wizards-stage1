#!/usr/bin/env node
const { main } = require('../src/index');

main(process.argv).catch((err) => {
  const message = err && err.message ? err.message : 'Unexpected CLI failure';
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
