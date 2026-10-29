import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { inventory as generatedInventory, aboutMedia } from '../scripts/build-media-rights-inventory.mjs';

const inventory = JSON.parse(await readFile(new URL('../docs/media-rights-inventory.json', import.meta.url), 'utf8'));
const badges = inventory.assets.filter(asset => asset.id === 'about:gl-badge-about1');

test('regenerating the rights inventory retains the selected badge, its status and summary count', () => {
  assert.equal(aboutMedia.length, 1);
  assert.deepEqual(aboutMedia[0], badges[0]);
  assert.deepEqual(generatedInventory.assets.filter(asset => asset.id === badges[0].id), badges);
  assert.equal(generatedInventory.summary.aboutImages, 1);
  assert.equal(generatedInventory.summary.total, generatedInventory.assets.length);
  assert.ok(generatedInventory.statusDefinitions[badges[0].rightsStatus]);
});

test('the about badge is the selected About1 Figma asset with a local, source-linked callsite', async () => {
  assert.equal(badges.length, 1);
  const badge = badges[0];
  assert.equal(badge.sourceFrame, '27:163');
  assert.equal(badge.sourceNode, '27:111');
  assert.equal(new URL(badge.sourceUrl).searchParams.get('node-id'), '27-111');
  assert.equal(badge.sourceSha256, 'c0f0522abd11443c6ff8daa618f392eb5c6fd38dbe9ebb5409364b8ee0335301');
  const bytes = await readFile(new URL(`../public/${badge.path}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), badge.sha256);
  const source = await readFile(new URL('../src/AboutPage.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes(`withBase("${badge.path}")`));
  const markup = source.match(/<img\s+className="about-letter-badge"[\s\S]*?\/>/g);
  assert.equal(markup?.length, 1);
  assert.match(markup[0], /alt=""/);
  assert.match(markup[0], /aria-hidden="true"/);
  assert.doesNotMatch(markup[0], /onClick|tabIndex|role="button"/);
});

test('the compressed square badge decodes with transparent edges and stays within the image budget', async () => {
  const bytes = await readFile(new URL(`../public/${badges[0].path}`, import.meta.url));
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 768);
  assert.equal(metadata.height, metadata.width);
  assert.equal(metadata.hasAlpha, true);
  assert.ok(bytes.length < 1024 * 1024);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
    assert.equal(data[(y * info.width + x) * info.channels + 3], 0, 'no opaque square may cover the letter paper');
  }
  const alpha = (await sharp(bytes).stats()).channels[3];
  assert.equal(alpha.max, 255);
  assert.ok(alpha.mean > 90 && alpha.mean < 115, 'preserve the full badge silhouette and its transparent padding');
});
