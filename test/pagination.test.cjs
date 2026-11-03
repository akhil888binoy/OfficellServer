const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSkip } = require('../dist/utils/pagination');

test('pagination defaults missing and invalid offsets to zero', () => {
  assert.equal(parseSkip(undefined), 0);
  assert.equal(parseSkip('abc'), 0);
  assert.equal(parseSkip('-1'), 0);
  assert.equal(parseSkip('10'), 10);
});
