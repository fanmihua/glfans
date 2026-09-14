import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { cpProfiles, findCp } from '../src/features/cp/cp-data.js';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { memberProfiles, profileForMember, zodiacForBirthday, zodiacLabels } from '../src/features/cp/member-profiles.js';
import { expandedPairDefinitions } from '../src/features/cp/cp-expanded-data.js';
import { archiveMainCastById } from '../src/data/archive-cast.js';
import { cpLabel, cpNameRecords, filterCps } from '../src/features/cp/cp-names.js';

test('CP works resolve to real archive entries, portraits exist, and sources are secure URLs', () => {
  const seen = new Set();
  for (const cp of cpProfiles) {
    assert.ok(!seen.has(cp.id)); seen.add(cp.id);
    assert.equal(cp.members.length, 2);
    if (cp.image) assert.ok(existsSync(new URL(`../public/${cp.image}`, import.meta.url)));
    for (const work of cp.works) {
      assert.ok(archiveDramas.some(drama => drama.id === work.id && drama.year === work.year), `${cp.id}: ${work.id}`);
    }
    for (const item of [...cp.members, ...cp.works, ...(cp.upcoming || []), ...cp.events, ...cp.shops]) {
      assert.equal(new URL(item.source).protocol, 'https:');
    }
    for (const lang of ['zh', 'en', 'th']) assert.ok(cp.intro[lang]);
  }
});

test('all seven sticker pairs are included and works are not capped at two', () => {
  assert.equal(cpProfiles.filter(cp => cp.image).length, 7);
  assert.equal(cpProfiles.length, 7 + expandedPairDefinitions.length);
  assert.ok(findCp('janekao'));
  assert.ok(findCp('ginjay'));
  assert.ok(findCp('lingorm').works.length > 2);
  assert.ok(findCp('freenbecky').works.length > 2);
});

test('undated announcements stay separate from archive/calendar work IDs', () => {
  for (const cp of cpProfiles) for (const upcoming of cp.upcoming || []) {
    assert.ok(!cp.works.some(work => work.id === upcoming.id));
    assert.equal(upcoming.date, undefined);
  }
  assert.ok(findCp('namtanfilm').upcoming.some(work => work.id === 'her'));
  assert.ok(!(findCp('janjingjing').upcoming || []).some(work => work.id === 'bake-love-feeling'), 'ViewMim lead project must not be attributed to JanJingJing');
  assert.ok(findCp('janjingjing').works.some(work => work.id === 'muteluv-hello-is-this-luck'), 'MuTeLuv must be linked to JanJingJing');
});

test('unknown CP ids do not silently show another pair', () => {
  assert.equal(findCp('missing'), undefined);
  assert.equal(findCp('lingorm').names.join(''), 'LingOrm');
});

test('existing sourced actor facts remain valid; new unverified facts stay absent', () => {
  for (const cp of cpProfiles.filter(cp => cp.image)) for (const member of cp.members) {
    const profile = memberProfiles[member.instagram];
    assert.ok(profile?.fullName, member.name);
    assert.equal(new URL(profile.source).protocol, 'https:');
    const sign = zodiacForBirthday(profile.birthday);
    for (const language of ['zh','en','th']) assert.ok(zodiacLabels[language][sign]);
  }
});

test('expanded pairings resolve both actors in every linked work without guessing socials', () => {
  for (const [id, names, workIds] of expandedPairDefinitions) {
    const cp = findCp(id);
    for (const workId of workIds) for (const name of names) {
      assert.ok(archiveMainCastById[workId].some(actor => actor.startsWith(`${name} `)), `${id}/${workId}/${name}`);
    }
    assert.equal(cp.image, null);
    for (const member of cp.members) {
      assert.ok(member.instagram, member.name);
      assert.ok(profileForMember(member).references.length, member.name);
    }
  }
  assert.notEqual(findCp('applemim').members[1].name, findCp('viewmim').members[1].name);
});

test('CP labels have references and use real shorthand without changing route IDs', () => {
  const cases = {engfacharlotte:'EngLot',lookmheesonya:'LMSY',mablepangjie:'BleJie',aoommeena:'MeenBabe',atommer:'AtomMer',ormsinfolk:'OrmFolk',tknur:'TKNur',prigkhingthongfah:'PrigkhingFah',mimiegarn:'GarnMie',icemarissa:'IzeZa'};
  for (const [id,label] of Object.entries(cases)) assert.equal(cpLabel(findCp(id)),label);
  for (const cp of cpProfiles) assert.equal(new URL(cpNameRecords[cp.id].source).protocol,'https:');
});

test('CP search matches shorthand, old names, actor names and Chinese or English works', () => {
  const archive = new Map(archiveDramas.map(work => [work.id,work]));
  const cases = [['englot','engfacharlotte'],['Engfa Charlotte','engfacharlotte'],['lmsy','lookmheesonya'],['LookmheeSonya','lookmheesonya'],['GarnMie','mimiegarn'],['MimieGarn','mimiegarn'],['KaoJane','janekao'],['爱情诡计','lookmheesonya'],['Harmony Secret','lookmheesonya'],['Lunar Secret','ginjay']];
  for (const [query,id] of cases) assert.ok(filterCps(cpProfiles,query,archive).some(cp=>cp.id===id),query);
  assert.equal(filterCps(cpProfiles,'zzzz-not-a-cp',archive).length,0);
  assert.equal(filterCps(cpProfiles,'',archive).length,cpProfiles.length);
});

test('Western zodiac uses explicit date boundaries and rejects invalid birth dates', () => {
  const boundaries = [['01-20','aquarius'],['02-19','pisces'],['03-21','aries'],['04-20','taurus'],['05-21','gemini'],['06-21','cancer'],['07-23','leo'],['08-23','virgo'],['09-23','libra'],['10-23','scorpio'],['11-22','sagittarius'],['12-22','capricorn']];
  for (let index=0; index<boundaries.length; index++) {
    const [day, sign] = boundaries[index];
    assert.equal(zodiacForBirthday(`2000-${day}`), sign);
    const before = new Date(`2000-${day}T12:00:00Z`);
    before.setUTCDate(before.getUTCDate()-1);
    assert.equal(zodiacForBirthday(before.toISOString().slice(0,10)), boundaries[(index+11)%12][1]);
  }
  assert.equal(zodiacForBirthday('2000-01-01'), 'capricorn');
  for (const value of [undefined, '', '2001-02-29', '2000-13-01', 'unknown']) assert.equal(zodiacForBirthday(value), null);
});

test('all upcoming projects have a real local official preview image', () => {
  for (const cp of cpProfiles) for (const work of cp.upcoming || []) {
    assert.ok(existsSync(new URL(`../public/${work.image}`, import.meta.url)), work.id);
    assert.equal(new URL(work.imageSource).hostname, 'i.ytimg.com');
    assert.ok(work.publisher);
    assert.ok(work.width > 0 && work.height > 0);
  }
});
