import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { archiveSearchQueryReady, archiveSearchResults } from '../src/features/archive/archive-search.js';

const { profiles: cpProfiles } = JSON.parse(await readFile(new URL('../src/features/cp/generated/index.json', import.meta.url)));

test('archive search finds CPs by their displayed pairing names', () => {
  assert.equal(archiveSearchResults('LingOrm', archiveDramas, cpProfiles)[0]?.href, '#/cp/lingorm');
  assert.equal(archiveSearchResults('Orm', archiveDramas, cpProfiles)[0]?.href, '#/cp/lingorm');
});

test('archive search finds series by Chinese and English title', () => {
  const chinese = archiveSearchResults('冥王星之恋', archiveDramas, cpProfiles);
  const english = archiveSearchResults('Pluto', archiveDramas, cpProfiles);
  assert.equal(chinese[0]?.href, '#/archive/2024/pluto');
  assert.equal(english[0]?.href, '#/archive/2024/pluto');
});

test('archive search ignores visual separators and caps result count', () => {
  assert.equal(archiveSearchResults('Ling Orm', archiveDramas, cpProfiles)[0]?.href, '#/cp/lingorm');
  assert.equal(archiveSearchResults('love', archiveDramas, cpProfiles, 3).length, 3);
  assert.deepEqual(archiveSearchResults('   ', archiveDramas, cpProfiles), []);
});

test('archive search requires two continuous English letters but accepts one Chinese character', () => {
  assert.equal(archiveSearchQueryReady('j'), false);
  assert.equal(archiveSearchQueryReady('ja'), true);
  assert.equal(archiveSearchQueryReady('冥'), true);
  assert.deepEqual(archiveSearchResults('j', archiveDramas, cpProfiles), []);
  assert.equal(archiveSearchResults('冥', archiveDramas, cpProfiles)[0]?.href, '#/archive/2024/pluto');

  const cpLabels = archiveSearchResults('ja', archiveDramas, cpProfiles, 20)
    .filter(result => result.kind === 'cp')
    .map(result => result.label);
  assert.deepEqual(cpLabels, ['GinJay', 'JaneKao', 'JanJingjing']);
  assert.ok(!cpLabels.includes('NattyYeepun'));
});

test('archive search links a directly matched person to their CP works', () => {
  const results = archiveSearchResults('emi', archiveDramas, cpProfiles, 20);
  assert.equal(results[0]?.href, '#/cp/emibonnie');
  assert.ok(results.some(result => result.href === '#/archive/2025/us'));
  assert.ok(results.some(result => result.href === '#/archive/2026/moonshadow'));
  assert.ok(!results.some(result => result.href === '#/archive/2025/player'));
});

test('archive search links JanJingjing to MuTeLuv', () => {
  const results = archiveSearchResults('jan', archiveDramas, cpProfiles, 20);
  assert.ok(results.some(result => result.href === '#/archive/2025/muteluv-hello-is-this-luck'));
});

test('archive search does not join separated letters into a false match', () => {
  const separatedCp = [{ id: 'separated', names: ['J', 'A'], aliases: [], members: [] }];
  assert.deepEqual(archiveSearchResults('ja', [], separatedCp), []);
});
