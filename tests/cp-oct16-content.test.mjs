import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { cpProfiles, findCp, cpsForWork } from '../src/features/cp/cp-data.js';
import { cpLabel, filterCps } from '../src/features/cp/cp-names.js';
import { profileForMember } from '../src/features/cp/member-profiles.js';
import { statusForCp } from '../src/features/cp/cp-status.js';
import { archiveDramas } from '../src/data/archive-dramas.js';

test('October requested pairings link both directions without duplicate CP records', () => {
  const cases = [['mewrenee','poisonous-love'],['viewjune','23-5'],['icemarissa','blank'],['icemarissa','blank-season-2'],['junemewnich','whale-store-xoxo'],['noonpraewa','love-senior'],['shumook','shades'],['andalookkaew','khom-khlang'],['tubtimfilm','mom-ped-sawan']];
  for (const [cpId, workId] of cases) {
    assert.equal(cpProfiles.filter(cp => cp.id === cpId).length, 1, cpId);
    assert.equal(findCp(cpId).works.filter(work => work.id === workId).length, 1, `${cpId}/${workId}`);
    assert.ok(cpsForWork(workId).some(cp => cp.id === cpId));
  }
  assert.equal(findCp('andalookkaew').works.find(work => work.id === 'khom-khlang').relationship, 'supporting');
  assert.equal(findCp('tubtimfilm').works[0].relationship, 'pair');
});

test('reused actors preserve one biography and historical CP search aliases', () => {
  const june = profileForMember(findCp('viewjune').members[1]);
  assert.deepEqual(june, profileForMember(findCp('junemewnich').members[0]));
  assert.deepEqual(profileForMember(findCp('viewjune').members[0]), profileForMember(findCp('viewmim').members[0]));
  assert.equal(june.birthday, '2000-04-19');
  assert.equal(june.heightCm, 162);
  assert.equal(profileForMember(findCp('junemewnich').members[1]).birthday, '2002-03-11');
  assert.equal(cpLabel(findCp('icemarissa')), 'IzeMarissa');
  const archive = new Map(archiveDramas.map(work => [work.id, work]));
  for (const query of ['IzeMarissa','IzeZa','IceMarissa','爱填满空白']) assert.ok(filterCps(cpProfiles, query, archive).some(cp => cp.id === 'icemarissa'));
});

test('catalogue split claims and conflicting personal fields remain unverified', () => {
  for (const id of ['mewrenee','viewjune','junemewnich']) assert.equal(statusForCp(id).status, 'unverified');
  const shu = profileForMember(findCp('shumook').members[0]);
  assert.equal(shu.instagram, 'shuu.nc');
  assert.equal(shu.birthday, null, 'source contradicts itself between February 5 and 6');
  assert.notEqual(shu.instagram, 'meenaxrina', 'reference site copied another pair’s social links');
  assert.equal(profileForMember(findCp('shumook').members[1]).instagram, 'mookworranit');
  assert.equal(profileForMember(findCp('tubtimfilm').members[0]).heightCm, null, '163/165 cm conflict remains unresolved');
});

test('October real photos retain attribution, original dimensions and per-image budget', () => {
  const records = JSON.parse(readFileSync(new URL('../docs/research/cp-20261016/photos.json', import.meta.url)));
  assert.equal(new Set(records.map(photo => photo.sha256)).size, records.length);
  for (const record of records) {
    const cp = findCp(record.id);
    const file = new URL(`../${record.file}`, import.meta.url);
    assert.ok(statSync(file).size <= 1024 * 1024);
    assert.equal(cp.imageSource, 'https://glthai.com/couple/');
    assert.equal(cp.imageOriginalSource, record.source);
    assert.equal(cp.imageWidth, record.width);
    assert.equal(cp.imageHeight, record.height);
    assert.equal(cp.imageCheckedAt, '2026-10-16');
    const landscape = record.width > record.height;
    assert.equal(cp.portraitTemplate, landscape ? 'landscape' : 'portrait');
    assert.equal(cp.portraitFrame, landscape ? 'assets/cp/portraits/scrapbook-landscape-frame-v1.webp' : 'assets/cp/portraits/scrapbook-frame-v1.webp');
    assert.equal(readFileSync(file).toString('ascii', 8, 12), 'WEBP');
  }
});
