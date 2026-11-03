const test = require('node:test');
const assert = require('node:assert/strict');
const { createOAuthState, isValidOAuthState } = require('../dist/utils/oauthState');

test('OAuth state accepts only the matching value', () => {
  const state = createOAuthState();
  assert.match(state, /^[a-f0-9]{64}$/);
  assert.equal(isValidOAuthState(state, state), true);
  assert.equal(isValidOAuthState(state, createOAuthState()), false);
  assert.equal(isValidOAuthState(state, undefined), false);
  assert.equal(isValidOAuthState('123456', '123456'), false);
});
