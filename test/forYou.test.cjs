const test = require('node:test');
const assert = require('node:assert/strict');
const { rankForYou } = require('../dist/utils/forYou');

const now = Date.parse('2026-11-02T00:00:00Z');
const post = (id, company_id, hoursOld, overrides = {}) => ({
  id, company_id, category: 'HR Tales', createdAt: new Date(now - hoursOld * 3_600_000),
  upvote: 0, downvote: 0, _count: { comments: 0, reports: 0 }, ...overrides,
});

test('a followed company is useful, but fresh and other companies remain visible', () => {
  const posts = [post(1, 1, 12), post(2, 1, 13), post(3, 1, 14), post(4, 2, 1), post(5, 3, 2), post(6, 4, 3)];
  const ids = rankForYou(posts, new Set([1]), new Set(), now);
  assert.equal(ids[0], 1);
  assert.equal(new Set(ids).size, posts.length);
  assert.ok(ids.slice(0, 4).some(id => id >= 4));
});

test('pending reports reduce prominence without suppressing the story', () => {
  const ids = rankForYou([post(1, 1, 1, { _count: { comments: 0, reports: 4 } }), post(2, 2, 1)], new Set(), new Set(), now);
  assert.deepEqual(ids, [2, 1]);
});

test('nearby local stories rise without hiding distant stories', () => {
  const local = (country, mapLat, mapLng) => ({ type: 'LOCAL', country, isRemote: false, mapLat, mapLng });
  const posts = [
    post(1, 1, 2, { company: local('IN', 28.61, 77.21) }),
    post(2, 2, 2, { company: local('IN', 12.97, 77.59) }),
    post(3, 3, 2, { company: local('US', 37.77, -122.42) }),
  ];
  const ids = rankForYou(posts, new Set(), new Set(), now, { country: 'IN', latitude: 12.97, longitude: 77.59 });
  assert.equal(ids[0], 2);
  assert.deepEqual(new Set(ids), new Set([1, 2, 3]));
});

test('MNC boost uses the tagged post country, not its company-wide presence', () => {
  const company = { type: 'MNC', country: null, isRemote: false, mapLat: null, mapLng: null };
  const posts = [
    post(1, 1, 2, { company, location: { country: 'SG' } }),
    post(2, 2, 2, { company, location: { country: 'IN' } }),
    post(3, 3, 2, { company, location: null }),
  ];
  const ids = rankForYou(posts, new Set(), new Set(), now, { country: 'IN' });
  assert.equal(ids[0], 2);
});
