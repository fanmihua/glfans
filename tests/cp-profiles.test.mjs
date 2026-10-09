import test from 'node:test';
import assert from 'node:assert/strict';
import { cpProfiles, findCp } from '../src/features/cp/cp-data.js';
import { profileForMember, zodiacForBirthday } from '../src/features/cp/member-profiles.js';
import { cpCommunities } from '../src/features/cp/cp-communities.js';
import { profileCoverage } from '../src/features/cp/profile-coverage.js';
import { cpCopy } from '../src/features/cp/cp-copy.js';
import { additionalCpProfiles } from '../src/features/cp/cp-additional-data.js';
import { announcedPairDefinitions } from '../src/features/cp/cp-expanded-data.js';
const announcedIds = new Set(announcedPairDefinitions.map(cp => cp.id));

test('the original 51 pairings retain sourced identities and new pairings keep unknown facts explicit', () => {
  const stats = profileCoverage();
  const original = cpProfiles.filter(cp => !announcedIds.has(cp.id) && !additionalCpProfiles.some(extra => extra.id === cp.id));
  assert.equal(original.length, 51);
  assert.equal(new Set(original.flatMap(cp => cp.members.map(member => member.name))).size, 101);
  assert.equal(stats.cpCount, 65);
  assert.equal(stats.actorCount, 127);
  assert.equal(stats.fields.fullName, 125);
  assert.equal(stats.fields.instagram, 125);
  assert.ok(stats.fields.birthday >= 100);
  assert.ok(stats.fields.x >= 95);
  assert.ok(stats.fields.weibo >= 60);
  for (const cp of cpProfiles) for (const member of cp.members) {
    const profile = profileForMember(member);
    assert.ok(profile.references.length, member.name);
    for (const reference of profile.references) assert.equal(new URL(reference.url).protocol, 'https:');
    if (profile.birthday) assert.ok(zodiacForBirthday(profile.birthday), member.name);
    if (!announcedIds.has(cp.id) || member.instagram) assert.match(member.instagram, /^[A-Za-z0-9._]+$/);
    if (member.x) assert.match(member.x, /^[A-Za-z0-9_]{1,15}$/);
    if (member.weibo) {
      assert.equal(new URL(member.weibo.url).hostname, 'weibo.com');
      assert.ok(member.weibo.uid || member.weibo.handle);
      assert.ok(member.weibo.sourceKind);
    }
  }
});

test('newly researched actors retain evidence and unresolved fields stay absent', () => {
  for (const member of findCp('tanzanook').members) {
    const profile = profileForMember(member);
    for (const field of ['birthday', 'heightCm', 'x', 'weibo', 'fullName', 'instagram']) assert.equal(profile[field], null, member.name);
    assert.ok(profile.references.some(reference => reference.kind === 'producer'));
  }
  assert.equal(profileForMember(findCp('friendpalm').members[0]).heightCm, 173);
  assert.equal(profileForMember(findCp('friendpalm').members[1]).heightCm, 158);
  assert.equal(profileForMember(findCp('pimjipineare').members[0]).x, 'Pimjirajlr');
  assert.equal(profileForMember(findCp('pimjipineare').members[1]).heightCm, 160);
  assert.equal(profileForMember(findCp('ferinpuifai').members[0]).heightCm, null, 'Ferin height sources conflict');
  assert.equal(profileForMember(findCp('ferinpuifai').members[1]).birthday, '2001-05-09');
});

test('repeated actors share identities while similar nicknames stay separate', () => {
  assert.deepEqual(profileForMember(findCp('fayeatom').members[0]), profileForMember(findCp('fayeyoko').members[0]));
  assert.notEqual(findCp('applemim').members[1].instagram, findCp('viewmim').members[1].instagram);
  assert.notEqual(findCp('atommer').members[0].instagram, findCp('fayeatom').members[1].instagram);
  assert.notEqual(findCp('memiice').members[1].instagram, findCp('icemarissa').members[0].instagram);
});

test('missing and conflicting data stays explicit rather than fabricating dates or accounts', () => {
  const mimie = profileForMember(findCp('mimiegarn').members[0]);
  assert.equal(mimie.birthday, null);
  assert.equal(mimie.birthdayMonthDay, '04-03');
  assert.equal(mimie.x, 'mimieahc');
  assert.equal(profileCoverage().birthdayWithMonthDay, 123);
  assert.equal(profileForMember(findCp('viewmim').members[0]).weibo, null);
  assert.equal(profileForMember(findCp('yoshidiana').members[0]).x, null);
});

test('48 directly researched CP communities remain distinct from personal/official accounts', () => {
  assert.equal(Object.keys(cpCommunities).length, 48);
  for (const [cpId, community] of Object.entries(cpCommunities)) {
    assert.ok(findCp(cpId));
    assert.equal(community.kind, 'fan-community');
    assert.equal(new URL(community.source).protocol, 'https:');
    assert.equal(decodeURIComponent(new URL(community.url).pathname), `/k/${community.name}`);
  }
  assert.equal(cpCommunities.tknur.name, 'TKNur北瓜');
  assert.equal(cpCommunities.ormsinfolk.name, 'ormfolky');
  assert.equal(cpCommunities.mablepangjie.name, 'MablePangjie');
  assert.equal(cpCommunities.mimiegarn, undefined);
});

test('new profile and community copy is available in all site languages', () => {
  for (const locale of ['zh', 'en', 'th']) {
    for (const key of ['height','weibo','notVerified','community','communityNote','communityPending','profileNote','officialAnnouncement','openAnnouncement']) assert.ok(cpCopy[locale][key]);
    for (const kind of ['agency','producer','artist','media','catalogue','fan-index','organizer']) assert.ok(cpCopy[locale].referenceKinds[kind]);
  }
});
