import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cpProfiles, findCp, cpsForWork } from '../src/features/cp/cp-data.js';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { archiveMainCastById, archiveCharacterCastById } from '../src/data/archive-cast.js';
import { cpLabel, filterCps } from '../src/features/cp/cp-names.js';
import { profileForMember } from '../src/features/cp/member-profiles.js';
import { actorProfiles } from '../src/features/cp/actor-profiles.js';
import { statusForCp } from '../src/features/cp/cp-status.js';
import { relatedCpsForWork } from '../src/features/cp/cp-work-order.js';

const expected = [
  { id: 'opalmint', label: 'OpalMint', members: ['Opal Kulwipa Ngamsukkasemsri', 'Mint Benjanee Watcharavasoontara'], roles: ['Amy', 'Sophie'], rolesTh: ['เอมี่', 'โซฟี'], instagram: ['thepigwipa', 'mmint.w'] },
  { id: 'puyfaiploy', label: 'PuyfaiPloy', members: ['Puyfai Tharathip Baisaeng', 'Ploy Jhutamas Pakonworrawong'], roles: ['Jane', 'Nano'], rolesTh: ['เจน', 'นาโน'], instagram: ['puyy_faii', 'jhutaa'] },
  { id: 'nikyengland', label: 'NikyEngland', members: ['Niky Warinrat Yolprasong', 'England Ladamanee Rattanapornvareesakul'], roles: ['Belle', 'Earn'], rolesTh: ['เบลล์', 'เอิร์น'], instagram: ['youknowinever_', 'eng_lr39'] },
];

test('the three requested Shades pairings resolve to the existing archive and actual character relationships', () => {
  const archive = archiveDramas.filter(drama => drama.id === 'shades');
  assert.equal(archive.length, 1);
  assert.equal(archive[0].title, '女校风云');
  const ids = ['shumook', ...expected.map(item => item.id)];
  assert.deepEqual(cpsForWork('shades').map(cp => cp.id), ids);
  assert.equal(archiveMainCastById.shades.length, 8, 'existing eight-actor cast is retained');
  assert.equal(new Set(archiveCharacterCastById.shades.map(item => item.actor)).size, 8);
  for (const record of expected) {
    const cp = findCp(record.id);
    assert.equal(cpProfiles.filter(item => item.id === record.id).length, 1);
    assert.equal(cpLabel(cp), record.label);
    assert.deepEqual(cp.members.map(member => member.name), record.members);
    const work = cp.works.find(item => item.id === 'shades');
    assert.equal(work.title, 'Shades', 'shared work title remains the official title across locales');
    assert.deepEqual(work.roles, record.roles);
    assert.deepEqual(work.cast.map(item => item.roleTh), record.rolesTh);
    assert.deepEqual(work.cast.map(item => item.actor), record.members);
    assert.equal(work.relationship, 'ensemble');
    assert.equal(work.ensemble, true);
    assert.ok(work.cast.every(item => archiveMainCastById.shades.includes(item.actor)));
    assert.equal(cp.image, null, 'no guessed portraits');
    assert.equal(statusForCp(cp.id).status, 'unverified', 'historical characters do not establish current collaboration status');
    for (const locale of ['zh', 'en', 'th']) assert.ok(cp.intro[locale]);
    assert.ok(cp.intro.zh.includes('女校风云'));
    assert.ok(cp.intro.en.includes('Shades'));
    assert.doesNotMatch(cp.intro.en, /女校风云/);
    assert.doesNotMatch(cp.intro.th, /女校风云/);
  }
});

test('ShuMook retains its identity, portrait and roles within the four-pair ensemble', () => {
  const cp = findCp('shumook');
  assert.deepEqual(cp.members.map(member => member.name), ['Shu Nunnicha Saehuang', 'Mook Worranit Thawornwong']);
  const work = cp.works.find(item => item.id === 'shades');
  assert.deepEqual(work.roles, ['Mink', 'Nalin']);
  assert.equal(work.relationship, 'ensemble');
  assert.ok(cp.image && cp.imageSource);
  assert.equal(profileForMember(cp.members[0]).instagram, 'shuu.nc');
  assert.equal(profileForMember(cp.members[1]).instagram, 'mookworranit');
});

test('new Shades actors use shared biography keys and broadcaster-linked accounts without guessed fields', () => {
  const actorIds = new Set();
  for (const record of expected) {
    const cp = findCp(record.id);
    cp.members.forEach((member, index) => {
      const profile = profileForMember(member);
      actorIds.add(profile.id);
      assert.ok(actorProfiles[member.name]);
      assert.equal(profile.fullName, actorProfiles[member.name].fullName);
      assert.equal(profile.instagram, record.instagram[index]);
      for (const field of ['birthday', 'heightCm', 'x', 'weibo']) assert.equal(profile[field], null, `${member.name}/${field}`);
      assert.ok(profile.references.some(reference => reference.kind === 'catalogue' && reference.url.startsWith('https://thaicontentdb.com/en/persons/')));
      assert.ok(profile.references.some(reference => reference.kind === 'publisher' && reference.url === 'https://entertainment.trueid.net/detail/xAJ1J6NyYe9O'));
      assert.ok(profile.references.some(reference => reference.kind === 'producer' && reference.url === 'https://www.youtube.com/watch?v=NhK6U0NrjD8'));
    });
  }
  assert.equal(actorIds.size, 6);
  assert.notEqual(findCp('puyfaiploy').members[0].name, findCp('ferinpuifai').members[1].name);
  assert.notEqual(findCp('puyfaiploy').members[0].instagram, findCp('ferinpuifai').members[1].instagram);
});

test('archive, calendar and CP search share the same four Shades links', () => {
  const index = JSON.parse(readFileSync(new URL('../src/features/cp/generated/index.json', import.meta.url)));
  const ids = ['shumook', ...expected.map(item => item.id)];
  assert.deepEqual(relatedCpsForWork(index.profiles, 'shades').map(cp => cp.id), ids);
  const archive = new Map(archiveDramas.map(drama => [drama.id, drama]));
  assert.deepEqual(filterCps(cpProfiles, '女校风云', archive).map(cp => cp.id), ids);
  for (const record of expected) {
    assert.deepEqual(filterCps(cpProfiles, record.id, archive).map(cp => cp.id), [record.id]);
    const payload = JSON.parse(readFileSync(new URL(`../src/features/cp/generated/${record.id}.json`, import.meta.url)));
    assert.equal(payload.works.find(work => work.id === 'shades').image, archive.get('shades').image);
    assert.equal(payload.cp.works[0].relationship, 'ensemble');
    assert.deepEqual(payload.cp.members.map(member => member.profile.instagram), record.instagram);
  }
});
