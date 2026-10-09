import test from 'node:test';
import assert from 'node:assert/strict';
import { cpProfiles, findCp, cpsForWork } from '../src/features/cp/cp-data.js';
import { additionalCpProfiles } from '../src/features/cp/cp-additional-data.js';
import { profileForMember } from '../src/features/cp/member-profiles.js';
import { filterCps } from '../src/features/cp/cp-names.js';
import { archiveDramas } from '../src/data/archive-dramas.js';

test('supporting pairs are searchable and linked to the same archive works', () => {
  const expected = {
    moonshadow: ['emibonnie', 'namtanfilm'],
    'enemies-with-benefits': ['janjingjing', 'kapookciize'],
    'chasing-love': ['nilenamwan', 'faygene', 'giftaomsin'],
    'harmony-secret': ['lookmheesonya', 'lillybelle'],
    queendom: ['arhoungpamp', 'linnpraew'],
    'love-design': ['janekao', 'friendpalm'],
    'mission-love-or-lies': ['ploypunch', 'tiankitty'],
    runaway: ['musicplaifah'], 'roller-coaster': ['aomshelly'],
    'music-story-losing-control': ['bminemekkhala', 'bminemashii'],
  };
  for (const [work, ids] of Object.entries(expected)) assert.deepEqual(cpsForWork(work).map(cp => cp.id).sort(), ids.sort());
  for (const id of ['kapookciize','faygene','giftaomsin','linnpraew','friendpalm']) assert.equal(findCp(id).works[0].relationship, 'supporting');
  const archive = new Map(archiveDramas.map(work => [work.id, work]));
  for (const [query, id] of [['糖影','namtanfilm'],['卡冰','kapookciize'],['设计爱情','friendpalm'],['危情谎言','ploypunch'],['Plaifah Siraacha','musicplaifah']]) assert.ok(filterCps(cpProfiles,query,archive).some(cp=>cp.id===id));
});

test('new records have sourced personal profiles and reuse the existing B Mine identity', () => {
  const bmine = profileForMember(findCp('bminenear').members[0]);
  assert.deepEqual(profileForMember(findCp('bminemekkhala').members[0]), bmine);
  assert.deepEqual(profileForMember(findCp('bminemashii').members[0]), bmine);
  for (const cp of additionalCpProfiles) for (const member of cp.members) {
    if (member.name === 'B Mine Jiratchaya Komontut' || cp.id === 'kapookciize') continue;
    const profile = profileForMember(member);
    assert.match(profile.birthday, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(profile.instagram);
    assert.equal(profile.checkedAt, '2026-10-09');
    assert.ok(profile.references.length);
  }
});

test('height corrections retain their non-official provenance', () => {
  const members = findCp('jessietungpang').members.map(profileForMember);
  assert.deepEqual(members.map(m=>m.heightCm), [169,167]);
  for (const member of members) {
    assert.equal(member.heightCorrection.officialVerified, false);
    assert.ok(member.references.some(r=>r.kind==='reader-correction'));
  }
});

test('Kapook and Ciize use the verified agency profiles', () => {
  const members = findCp('kapookciize').members.map(profileForMember);
  assert.deepEqual(members.map(m=>[m.birthday,m.heightCm,m.instagram,m.x]), [
    ['1994-10-29',167,'kapookphat','KPloynira'],
    ['1999-09-23',155,'ciizezphr','Ciize155cm'],
  ]);
  assert.ok(members.every(m=>m.references.some(r=>r.kind==='agency' && r.url.includes('/artists/view/'))));
});

test('profile completion preserves unconfirmed fields and producer provenance', () => {
  const pair = findCp('friendpalm').members.map(profileForMember);
  assert.deepEqual(pair.map(p=>p.heightCm), [173,158]);
  assert.ok(pair.every(p=>p.references.some(r=>r.kind==='agency' && r.url.includes('velcurve.com'))));
  assert.equal(profileForMember(findCp('musicplaifah').members[1]).x, 'ginaraigoraroii');
  const unverified = profileForMember({name:'Unresearched actor'});
  assert.equal(unverified.birthday, null);
  assert.equal(unverified.heightCm, null);
  assert.equal(unverified.instagram, null);
  assert.equal(unverified.x, null);
  assert.ok(findCp('tiankitty').members.map(profileForMember).every(p=>p.heightCm===null));
});


test('corrected names retain stable routes, correct people and official ended status', async () => {
  const { cpLabel } = await import('../src/features/cp/cp-names.js');
  const { noticeForCp } = await import('../src/features/cp/cp-timeline.js');
  assert.equal(cpLabel(findCp('aomshelly')), 'ShellyPundao');
  assert.equal(cpLabel(findCp('musicplaifah')), 'PlaifahMiusic');
  assert.equal(findCp('musicplaifah').members[0].name, 'Plaifah Siraacha');
  assert.equal(profileForMember(findCp('aomshelly').members[1]).instagram, '_pundao');
  assert.equal(noticeForCp('aomshelly').date, '2026-10-01');
  assert.equal(new Set(noticeForCp('aomshelly').images.map(i=>i.image)).size, 4);
  assert.ok(filterCps(cpProfiles, 'AomShelly', new Map()).some(cp=>cp.id==='aomshelly'));
});

test('Pluto supporting storyline includes Earn without inventing a three-person CP', () => {
  const cp = findCp('kapookciize');
  const work = cp.works.find(w=>w.id==='pluto');
  assert.equal(cp.members.length, 2);
  assert.deepEqual(work.cast.map(p=>p.role), ['Pim','Pang','Jan']);
  assert.equal(work.cast[2].actor, 'Earn Preeyaphat');
  assert.equal(work.image, null);
  assert.ok(filterCps(cpProfiles, 'Earn', new Map()).some(result=>result.id===cp.id));
});


test('supporting pairs do not inherit lead-pair trailer artwork as their own media', async () => {
  const { mediaForCp } = await import('../src/features/cp/cp-media.js');
  const media = mediaForCp('kapookciize');
  assert.ok(media.some(item=>item.id==='Kdyph-0nKwc' && item.scope==='duet'));
  assert.ok(!media.some(item=>item.kind==='trailer'));
  assert.ok(mediaForCp('namtanfilm').some(item=>item.kind==='trailer' && item.workId==='pluto'));
});
