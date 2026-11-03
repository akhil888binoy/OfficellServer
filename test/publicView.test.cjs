const test = require('node:test');
const assert = require('node:assert/strict');
const { forViewerVent, forViewerComment, forViewerSubcomment, publicCompany } = require('../dist/utils/publicView');

test('previously anonymous posts keep their authors hidden', () => {
  const post = { id: 9, author_id: 12, author: { username: 'unique-handle' }, content: 'A review', no_pii: true, verified_employee: true, createdAt: new Date('2026-10-29T15:42:00Z'), updatedAt: new Date('2026-10-29T15:42:00Z'), Media: [{ id: 2, createdAt: new Date('2026-10-29T15:42:00Z') }] };
  const readerView = forViewerVent(post, 20);
  assert.equal(readerView.author_id, null);
  assert.equal(readerView.author.username, 'Anonymous');
  assert.equal(readerView.content, 'A review');
  assert.equal(readerView.no_pii, false);
  assert.equal(readerView.verified_employee, false);
  assert.equal(readerView.createdAt.toISOString(), '2026-10-26T00:00:00.000Z');
  assert.equal(readerView.updatedAt, undefined);
  assert.equal(readerView.Media[0].createdAt, undefined);
  assert.equal(forViewerVent(post, 12).author_id, 12);
});

test('previously anonymous comments and replies keep their authors hidden', () => {
  const comment = {
    id: 4,
    author_id: 12,
    author: { id: 12, username: 'unique-handle' },
    createdAt: new Date('2026-10-29T15:42:00Z'),
    subcomments: [{ id: 5, author_id: 13, author: { id: 13, username: 'another-handle' }, createdAt: new Date('2026-10-29T15:42:00Z') }],
  };
  const view = forViewerComment(comment, 20);
  assert.equal(view.author_id, null);
  assert.equal(view.author.username, 'Anonymous');
  assert.equal(view.subcomments[0].author_id, null);
  assert.equal(view.subcomments[0].author.id, null);
  assert.equal(view.subcomments[0].author.username, 'Anonymous');
  assert.equal(view.createdAt.toISOString(), '2026-10-26T00:00:00.000Z');
  assert.equal(view.subcomments[0].createdAt.toISOString(), '2026-10-26T00:00:00.000Z');
  assert.equal(forViewerSubcomment(comment.subcomments[0], 13).author.id, 13);
});

test('new posts and replies show chosen usernames without exposing account IDs', () => {
  const post = { id: 9, author_id: 12, showUsername: true, author: { username: 'work_voice' } };
  const readerPost = forViewerVent(post, 20);
  assert.equal(readerPost.author.username, 'work_voice');
  assert.equal(readerPost.author_id, null);
  const comment = { id: 4, author_id: 12, showUsername: true, author: { id: 12, username: 'work_voice' }, subcomments: [
    { id: 5, author_id: 13, showUsername: true, author: { id: 13, username: 'another_voice' } },
  ] };
  const readerComment = forViewerComment(comment, 20);
  assert.equal(readerComment.author.username, 'work_voice');
  assert.equal(readerComment.author_id, null);
  assert.equal(readerComment.subcomments[0].author.username, 'another_voice');
  assert.equal(readerComment.subcomments[0].author.id, null);
  assert.equal(readerComment.subcomments[0].author_id, null);
});

test('company timestamps are also rounded to a week', () => {
  const company = publicCompany({ id: 3, createdAt: new Date('2026-10-29T15:42:00Z'), updatedAt: new Date('2026-10-29T15:42:00Z') });
  assert.equal(company.createdAt.toISOString(), '2026-10-26T00:00:00.000Z');
  assert.equal(company.updatedAt, undefined);
});
