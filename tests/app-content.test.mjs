import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_FILE_NAMES, collectAssetPaths, createAppSnapshot, filterCollections, publicCpDetail, sha256, writeAppContent } from '../scripts/lib/app-content.mjs';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { mergeCalendarData } from '../src/features/archive/calendar-data.js';
import { publicColumns, publicArticleTranslations } from '../scripts/lib/public-columns.mjs';

test('hidden article text and translations are excluded while shared visible text is retained', () => {
  const source = { collections: [{ articles: [
    { title: 'Open', xml: '<p>Shared</p><p>Visible</p>' },
    { title: 'Closed', hidden: true, xml: '<p>Shared</p><p>Hidden &amp; private</p>' },
  ] }] };
  const original = JSON.stringify(source);
  assert.deepEqual(publicColumns(source).collections[0].articles.map(a => a.title), ['Open']);
  assert.deepEqual(publicArticleTranslations({ Open: 'o', Closed: 'c', Shared: 's', Visible: 'v', 'Hidden & private': 'h', 'UI copy': 'ui' }, source),
    { Open: 'o', Shared: 's', Visible: 'v', 'UI copy': 'ui' });
  assert.equal(JSON.stringify(source), original);
});

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));

test('App shares current website series, published REPO articles and schedules without hidden modules', async () => {
  const snapshot = await createAppSnapshot(root);
  const source = await read('src/data/column-data.json');
  const visible = source.collections.filter(collection => !collection.hidden);
  assert.deepEqual(snapshot.catalog.dramas, archiveDramas);
  assert.deepEqual(snapshot.catalog.collections.map(collection => collection.slug), visible.map(collection => collection.slug));
  assert.ok(!snapshot.catalog.collections.some(collection => collection.slug === 'my-secret-words'));
  const hiddenUs = source.collections.find(c => c.slug === 'us').articles.filter(a => a.hidden);
  assert.equal(snapshot.catalog.collections.find(c => c.slug === 'us').articles.length, 12);
  for (const article of hiddenUs) {
    assert.ok(!JSON.stringify(snapshot.catalog).includes(article.slug));
    for (const locale of ['en', 'th']) assert.ok(!(article.title in snapshot[locale]));
  }
  for (const collection of snapshot.catalog.collections) {
    const articles = visible.find(item => item.slug === collection.slug).articles.filter(article => !article.hidden);
    assert.deepEqual(collection.articles.map(article => [article.slug, article.xml]), articles.map(article => [article.slug, article.xml]));
  }
  assert.deepEqual(snapshot.schedule, mergeCalendarData(await read('src/data/archive-history.json'), await read('src/data/archive-schedule.json')));
  assert.deepEqual(snapshot.catalog.quotes, []);
  assert.deepEqual(snapshot.catalog.radio.tracks, []);
  assert.deepEqual(snapshot.catalog.homeLinks.map(item => item.id), ['archive', 'cp', 'column', 'memes', 'about']);
  assert.equal(snapshot.cpCatalog.profiles.length, 51);
  for (const profile of snapshot.cpCatalog.profiles) {
    assert.equal(profile.detail.community, null);
    assert.deepEqual(profile.detail.cp.shops, []);
    assert.doesNotMatch(JSON.stringify(profile), /"radioTrackId"|huati\.weibo\.com/);
  }
  assert.deepEqual(snapshot.sourceContent.frequencyWords, []);
  assert.deepEqual(snapshot.sourceContent.frequencySegments, []);
  for (const locale of ['en', 'th']) assert.ok(snapshot[locale][snapshot.sourceContent.about.intro]);
});

test('hidden collection filtering and CP entrance removal do not mutate original data', () => {
  const source = [
    { title: 'visible', articles: [{ title: 'a', xml: '<p>A</p>' }, { title: 'b', hidden: true }] },
    { title: 'hidden', hidden: true, articles: [{ title: 'c' }] },
  ];
  const before = JSON.stringify(source);
  const result = filterCollections(source, (collection, article) => `${collection}: ${article}`);
  assert.equal(result.length, 1); assert.equal(result[0].articles.length, 1);
  assert.equal(result[0].articles[0].displayTitle, 'visible: a');
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(publicCpDetail({ cp: { shops: [{ url: 'https://shop.example' }] }, community: { url: 'https://community.example' }, media: [{ radioTrackId: 'track', image: 'assets/cp/a.webp' }] }),
    { cp: { shops: [] }, community: null, media: [{ image: 'assets/cp/a.webp' }] });
  assert.throws(() => collectAssetPaths('assets/../secret.png'), /Unsafe/);
});

test('manifest is deterministic and every file/image resolves to verified same-origin content bytes', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'glfans-app-content-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const first = await writeAppContent(root, directory, { generatedAt: '2026-09-18T00:00:00.000Z', sourceCommit: 'first' });
  const second = await writeAppContent(root, directory, { generatedAt: '2026-09-19T00:00:00.000Z', sourceCommit: 'second' });
  assert.equal(first.version, second.version);
  assert.deepEqual(Object.keys(first.files), Object.keys(APP_FILE_NAMES));
  assert.match(first.version, /^[a-f0-9]{64}$/);
  const snapshot = await createAppSnapshot(root);
  for (const asset of collectAssetPaths(snapshot)) assert.ok(first.assets[asset], asset);
  assert.ok(first.assets['assets/glfans-logo-brush.webp']);
  assert.ok(first.assets['assets/repo-article-card-frame-a-v1.webp']);
  assert.ok(!Object.keys(first.assets).some(asset => /pit-radio|my-secret-words/.test(asset)));
  for (const [key, entry] of [...Object.entries(first.files), ...Object.entries(first.assets)]) {
    const url = new URL(entry.url);
    assert.equal(url.origin, 'https://glfans.com');
    assert.match(url.pathname, new RegExp(`^/assets/app-content/${entry.sha256}\\.[a-z0-9]+$`));
    const bytes = await fs.readFile(path.join(directory, url.pathname.slice(1)));
    assert.equal(bytes.length, entry.bytes, key);
    assert.equal(sha256(bytes), entry.sha256, key);
    if (key.startsWith('assets/')) assert.equal(sha256(await fs.readFile(path.join(root, 'public', key))), entry.sha256, key);
  }
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'app-content/v1/manifest.json'), 'utf8')), second);
});
