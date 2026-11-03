const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { sanitizeImage } = require('../dist/utils/sanitizeImage');

test('re-encodes a photo without embedded EXIF metadata', async () => {
  const original = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } })
    .jpeg()
    .withExif({ IFD0: { Artist: 'Private author name' } })
    .toBuffer();
  assert.ok((await sharp(original).metadata()).exif);
  const clean = await sanitizeImage(original);
  const metadata = await sharp(clean.buffer).metadata();
  assert.equal(clean.mimeType, 'image/jpeg');
  assert.equal(metadata.exif, undefined);
});
