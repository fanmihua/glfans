import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';

const data = JSON.parse(readFileSync(new URL('../src/data/column-data.json', import.meta.url)));
const collection = data.collections.find(c => c.slug === 'us');
const expected = [
  [7, '27b16a8dca95a982d0a1348a067f599e6a94c399ed9925aecbcb51e3adb2f54d'],
  [7, 'dd3b6682ee3d6afd1c3c6a07ef80fb7aa432e5891c6b042689f83540252bed17'],
  [7, 'e0843188225c88fca88ee0b6eaf9e752b14dbb2b878f94a722cf387465770929'],
  [7, 'd9d4c50438fa3c1e12feb2b2246a568e4bb89532923638f51910246f29a743c1'],
  [7, 'e55bc90f5ee3bb0a657e7ae4ddc0b309010747498399c23b40187cb7aec674f2'],
  [9, 'b4327750c845df87fc4bfb67aec263f7153f8835174a5eb5d25ed4acbf7cea40'],
  [8, '56208c45176809ba4df6cc8493e1bf1042c3e4369100fe4998bd7614a3b9aec5'],
  [7, '7c24d78cf3f87501a506dcae91b7466aa95b6c129c80167af5d6b8480e923e37'],
  [8, 'cc4726eb598be17d5336b547a8a2cf4e1fa774b54f4069f2e94ae309739bfc07'],
  [8, '235574ffbc8b0933377a25c1f1905d36076c25240965680f507904a5be09fa48'],
];

test('Us source preserves EP01–EP12 in order and existing hidden collection flags', () => {
  assert.deepEqual(collection.articles.map(a => a.slug), Array.from({ length: 12 }, (_, i) => `unsaid-fragments-ep${String(i + 1).padStart(2, '0')}`));
  assert.ok(collection.articles.every(a => !a.hidden));
  assert.equal(data.collections.find(c => c.slug === 'my-secret-words').hidden, true);
});

test('EP03–EP12 preserve the verified Feishu wording and full block order', () => {
  for (const [i, article] of collection.articles.slice(2).entries()) {
    const images = [...article.xml.matchAll(/<img\b[^>]*\/>/g)];
    assert.equal(images.length, expected[i][0], article.slug);
    const normalized = article.xml.replace(/<img\b[^>]*\/>/g, '<image/>');
    assert.equal(createHash('sha256').update(normalized).digest('hex'), expected[i][1], article.slug);
    assert.equal(article.cover, images[0][0].match(/href="([^"]+)"/)[1]);
    assert.ok(images.every(m => /href="assets\/column\/us\//.test(m[0])));
  }
});

test('all 75 image positions resolve to optimized WebP assets without original PNG payloads', async () => {
  const refs = collection.articles.slice(2).flatMap(a => [...a.xml.matchAll(/<img\b[^>]*href="([^"]+)"[^>]*\/>/g)].map(m => m[1]));
  assert.equal(refs.length, 75);
  assert.equal(new Set(refs).size, 73);
  let bytes = 0;
  for (const ref of new Set(refs)) {
    const file = new URL(`../public/${ref}`, import.meta.url);
    const meta = await sharp(readFileSync(file)).metadata();
    assert.equal(meta.format, 'webp');
    assert.ok(meta.width <= 1600);
    assert.ok(meta.height > 0);
    bytes += statSync(file).size;
  }
  assert.equal(bytes, 7842422);
});

test('filing build keeps retained Us episodes out of public share pages', () => {
  for (const article of collection.articles.slice(2)) {
    assert.equal(existsSync(new URL(`../dist/client/column/us/${article.slug}/index.html`, import.meta.url)), false);
    assert.equal(existsSync(new URL(`../dist/client/column/us/${article.slug}/share.json`, import.meta.url)), false);
  }
  assert.equal(existsSync(new URL('../dist/client/archive/index.html', import.meta.url)), true, 'check a completed public build');
});

test('new episodes have complete English and Thai prose, with stable episode titles', () => {
  const decode = s => s.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replace(/\s+/g, ' ').trim();
  for (const locale of ['en', 'th']) {
    const catalog = JSON.parse(readFileSync(new URL(`../src/i18n/${locale}-article.json`, import.meta.url)));
    for (const article of collection.articles.slice(2)) {
      const episode = article.slug.match(/ep(\d+)$/)[1];
      assert.ok(catalog[article.title].endsWith(`EP${episode}`));
      for (const match of article.xml.matchAll(/>([^<>]+)</g)) {
        const source = decode(match[1]);
        if (!/\p{Script=Han}/u.test(source)) continue;
        assert.ok(catalog[source]?.trim(), `${locale}: ${article.slug}: missing ${source.slice(0, 40)}`);
        assert.doesNotMatch(catalog[source], /\p{Script=Han}|GLFANS_\d{4}/u);
      }
    }
  }
});
