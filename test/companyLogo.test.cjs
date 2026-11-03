const test = require('node:test');
const assert = require('node:assert/strict');
const { extractLogoCandidates, isPublicAddress } = require('../dist/utils/companyLogo');

test('uses a website icon before a social preview and resolves relative links', () => {
  const html = `<meta content="https://cdn.example.com/banner.png" property="og:image"><link href="/brand/icon.png?x=1&amp;y=2" rel="apple-touch-icon">`;
  const candidates = extractLogoCandidates(html, 'https://example.com/about');
  assert.equal(candidates[0], 'https://example.com/brand/icon.png?x=1&y=2');
  assert.equal(candidates[1], 'https://cdn.example.com/banner.png');
});

test('rejects private, local, and documentation network addresses', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.2', '::1', 'fc00::1', '2001:db8::1']) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});
