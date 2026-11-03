const test = require('node:test');
const assert = require('node:assert/strict');
const { findBlockingPrivacyIssues } = require('../dist/utils/privacyCheck');

test('blocks contact details and exact dates in a workplace post', () => {
  assert.deepEqual(findBlockingPrivacyIssues('Email me at jane@example.com'), ['email']);
  assert.deepEqual(findBlockingPrivacyIssues('Call +1 415 555 0182'), ['phone']);
  assert.deepEqual(findBlockingPrivacyIssues('This happened on 12/05/2025'), ['exact_date']);
  assert.deepEqual(findBlockingPrivacyIssues('This happened on October 12, 2025'), ['exact_date']);
});

test('allows broad descriptions without contact details', () => {
  assert.deepEqual(findBlockingPrivacyIssues('I joined in 2025 and left a few months later.'), []);
});
