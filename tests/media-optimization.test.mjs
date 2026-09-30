import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { optimizeImage } from '../scripts/lib/optimize-image.mjs';
import { memeCollection, memeGameCriticalAssets } from '../src/features/memes/meme-data.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('large transparent source becomes a bounded image with transparency intact', async () => {
  const input = await sharp({ create: { width: 2400, height: 1600, channels: 4, background: { r: 200, g: 40, b: 70, alpha: 0.5 } } }).png().toBuffer();
  const output = await optimizeImage(input, { maxDimension: 1280, maxBytes: 256 * 1024 });
  const meta = await sharp(output.buffer).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 1280);
  assert.ok(meta.height < 1280);
  assert.ok(meta.hasAlpha);
  assert.ok(output.bytes <= 256 * 1024);
  const again = await optimizeImage(input, { maxDimension: 1280, maxBytes: 256 * 1024 });
  assert.equal(again.filename, output.filename, 'identical content must deduplicate');
});

test('animated source retains every frame and timing', async () => {
  const pixels = Buffer.from([255,0,0,255,0,0,0,0,255,0,0,255]);
  const gif = await sharp(pixels, { raw: { width: 2, height: 2, channels: 3, pageHeight: 1 } }).gif({ delay: [100, 200], loop: 0 }).toBuffer();
  const result = await optimizeImage(gif, { maxDimension: 1280 });
  const meta = await sharp(result.buffer, { animated: true }).metadata();
  assert.equal(result.pages, 2);
  assert.deepEqual(meta.delay, [100, 200]);
});

test('image exceeding a strict byte budget is rejected instead of silently publishing', async () => {
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).png().toBuffer();
  await assert.rejects(optimizeImage(png, { maxBytes: 1 }), /exceeds/);
});

test('all imported memes have unique IDs, correct hashes and downloadable optimized assets', async () => {
  assert.ok(memeCollection.length > 5);
  assert.equal(new Set(memeCollection.map(m => m.id)).size, memeCollection.length);
  assert.equal(new Set(memeCollection.map(m => m.src)).size, memeCollection.length);
  assert.equal(memeGameCriticalAssets.length, 3, 'entering the game must not preload the full growing collection');
  for (const meme of memeCollection) {
    const bytes = await readFile(new URL(`../public/${meme.src}`, import.meta.url));
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.format, 'webp');
    assert.ok(Math.max(meta.width, meta.height) <= 1280);
    assert.ok(bytes.length <= 256 * 1024);
    if (meme.sha256) assert.equal(createHash('sha256').update(bytes).digest('hex'), meme.sha256);
  }
});
