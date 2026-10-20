import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cpProfiles, cpsForWork } from '../src/features/cp/cp-data.js';
import { relatedCpsForWork } from '../src/features/cp/cp-work-order.js';

const index = JSON.parse(readFileSync(new URL('../src/features/cp/generated/index.json', import.meta.url)));

test('archive and calendar links put each work’s lead pairing before supporting pairings', () => {
  const expected = {
    'khom-khlang': ['bintpuinoon', 'andalookkaew'],
    moonshadow: ['emibonnie', 'namtanfilm'],
    'chasing-love': ['nilenamwan', 'faygene', 'giftaomsin'],
    '23-5': ['milklove', 'viewjune'],
    'love-senior': ['andalookkaew', 'noonpraewa'],
  };
  for (const [workId, ids] of Object.entries(expected)) {
    assert.deepEqual(cpsForWork(workId).map(cp => cp.id), ids, workId);
    assert.deepEqual(relatedCpsForWork(index.profiles, workId).map(cp => cp.id), ids, `browser: ${workId}`);
  }
});

test('all generated relationships retain editorial ordering, including ensemble and storyline peers', () => {
  const before = cpProfiles.map(cp => cp.id);
  const workIds = new Set(cpProfiles.flatMap(cp => cp.works.map(work => work.id)));
  for (const workId of workIds) {
    assert.deepEqual(relatedCpsForWork(index.profiles, workId).map(cp => cp.id), cpsForWork(workId).map(cp => cp.id), workId);
    const matching = cpProfiles.filter(cp => cp.works.some(work => work.id === workId));
    const leads = matching.filter(cp => !['supporting', 'storyline'].includes(cp.works.find(work => work.id === workId).relationship));
    const supporting = matching.filter(cp => !leads.includes(cp));
    assert.deepEqual(cpsForWork(workId).map(cp => cp.id), [...leads, ...supporting].map(cp => cp.id), workId);
  }
  assert.deepEqual(cpProfiles.map(cp => cp.id), before, 'link sorting must not reorder the CP directory');
  assert.deepEqual(cpsForWork('unknown-work'), []);
});
