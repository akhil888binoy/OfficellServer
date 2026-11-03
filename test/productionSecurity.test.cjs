const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateProductionConfig } = require('../dist/config/production');
const { authCookieOptions } = require('../dist/config/authCookies');
const { verifyWriteOrigin } = require('../dist/middleware/requestProtection');

const valid = {
  NODE_ENV: 'production', DATABASE_URL: 'postgres://example', SECRET_KEY: 'secret',
  CLIENT_ID: 'id', CLIENT_SECRET: 'secret', REDIRECT_URI: 'https://api.example.com/v1/auth/linkedin/callback',
  FRONTEND_URL: 'https://app.example.com', CLOUD_NAME: 'cloud', API_KEY: 'key', API_SECRET: 'secret',
};

test('production configuration rejects missing and insecure origins', () => {
  assert.throws(() => validateProductionConfig({ ...valid, FRONTEND_URL: '' }), /FRONTEND_URL/);
  assert.throws(() => validateProductionConfig({ ...valid, FRONTEND_URL: 'http://app.example.com' }), /HTTPS/);
  assert.doesNotThrow(() => validateProductionConfig(valid));
});

test('production auth cookies are secure and explicitly scoped', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const options = authCookieOptions(1000);
    assert.equal(options.secure, true);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, 'lax');
    assert.equal(options.path, '/');
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('production write requests require the configured frontend origin', () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, FRONTEND_URL: process.env.FRONTEND_URL };
  process.env.NODE_ENV = 'production';
  process.env.FRONTEND_URL = 'https://app.example.com';
  try {
    const response = { code: 200, status(code) { this.code = code; return this; }, json() { return this; } };
    let nextCalled = false;
    const request = origin => ({ method: 'POST', get: header => header === 'origin' ? origin : undefined });
    verifyWriteOrigin(request('https://bad.example.com'), response, () => { nextCalled = true; });
    assert.equal(response.code, 403);
    assert.equal(nextCalled, false);
    verifyWriteOrigin(request('https://app.example.com'), response, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
