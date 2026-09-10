import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { cpProfiles, findCp } from '../src/features/cp/cp-data.js';
import { cpChildren, cpChildrenCopy, childForCp } from '../src/features/cp/cp-children.js';
import { timelineForCp, cpNotices } from '../src/features/cp/cp-timeline.js';
import { activeEvidence, countCpStatuses, cpStatusCopy, statusForCp } from '../src/features/cp/cp-status.js';

test('all five little ones belong to the verified pairing, with real editorial images', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(cpChildren).map(([id,child])=>[id,child.name])), {
    namtanfilm:'LUNAR', emibonnie:'ANY', milklove:'MUVMUV', janjingjing:'JEWEL', viewmim:'VIMMY',
  });
  assert.equal(childForCp('missing'), null);
  for (const [cpId,child] of Object.entries(cpChildren)) {
    assert.ok(findCp(cpId));
    assert.match(child.introduced, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(child.introduced <= child.checkedAt);
    assert.equal(new URL(child.source).protocol, 'https:');
    assert.ok(['pbs.twimg.com','i.ytimg.com'].includes(new URL(child.imageSource).hostname));
    for (const locale of ['zh','en','th']) assert.ok(child.story[locale]);
    for (const item of [child,child.video]) assert.ok(existsSync(new URL(`../public/${item.image}`,import.meta.url)));
    const welcome = timelineForCp(findCp(cpId)).find(item=>item.kind==='characterWelcome');
    assert.equal(welcome.title, child.name);
    assert.equal(welcome.lane, 'joint');
    assert.equal(welcome.sectionId, 'cp-children');
    assert.ok(!('price' in child) && !('stock' in child) && !('shop' in child));
  }
});

test('the little-one section is an album, with no commerce controls or redundant directory', () => {
  const source = readFileSync(new URL('../src/features/cp/CpChildren.jsx',import.meta.url),'utf8');
  assert.ok(!/price|currency|stock|cart|buy|shop/i.test(source));
  assert.ok(!/<(?:video|iframe)\b/.test(source));
  assert.equal(cpChildrenCopy.zh.title, '她们的娃');
  for (const copy of [cpChildrenCopy,cpStatusCopy]) for (const locale of ['en','th']) {
    assert.deepEqual(Object.keys(copy[locale]).sort(),Object.keys(copy.zh).sort());
  }
});

test('status totals use verified evidence, not the complement of ended partnerships', () => {
  const counts = countCpStatuses();
  assert.equal(counts.total,cpProfiles.length);
  assert.equal(counts.total,counts.active + counts.ended + counts.unverified);
  assert.equal(counts.ended,Object.keys(cpNotices).length);
  assert.equal(counts.active,Object.keys(activeEvidence).length);
  assert.ok(counts.unverified>0);
  assert.equal(statusForCp('fayeyoko').status,'unverified');
  assert.equal(statusForCp('faymay').status,'active');
  assert.equal(statusForCp('memiice').status,'ended');
  for (const [id,evidence] of Object.entries(activeEvidence)) {
    assert.ok(findCp(id));
    assert.ok(!cpNotices[id]);
    assert.equal(new URL(evidence.source).protocol,'https:');
    assert.ok(evidence.date && evidence.checkedAt && evidence.publisher && evidence.title);
  }
  assert.deepEqual(countCpStatuses([]),{total:0,active:0,ended:0,unverified:0});
});
