const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { loadEnvironment } = require('../dist/config/environment');

test('production loads only OfficellServer.env and preserves host-provided values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'officell-env-'));
  try {
    writeFileSync(join(dir, '.env'), 'DEV_ONLY=development\nSHARED=development\n');
    writeFileSync(join(dir, 'OfficellServer.env'), 'PROD_ONLY=production\nSHARED=production\n');
    const env = { NODE_ENV: 'production', SHARED: 'from-host' };
    loadEnvironment(env, dir);
    assert.equal(env.PROD_ONLY, 'production');
    assert.equal(env.DEV_ONLY, undefined);
    assert.equal(env.SHARED, 'from-host');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('development loads only .env', () => {
  const dir = mkdtempSync(join(tmpdir(), 'officell-env-'));
  try {
    writeFileSync(join(dir, '.env'), 'DEV_ONLY=development\n');
    writeFileSync(join(dir, 'OfficellServer.env'), 'PROD_ONLY=production\n');
    const env = { NODE_ENV: 'development' };
    loadEnvironment(env, dir);
    assert.equal(env.DEV_ONLY, 'development');
    assert.equal(env.PROD_ONLY, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('production never falls back to .env when its file is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'officell-env-'));
  try {
    writeFileSync(join(dir, '.env'), 'DEV_ONLY=development\n');
    const env = { NODE_ENV: 'production' };
    loadEnvironment(env, dir);
    assert.equal(env.DEV_ONLY, undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
