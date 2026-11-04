import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { cpProfiles, findCp, cpsForWork } from '../src/features/cp/cp-data.js';
import { gmmtvNextProjects } from '../src/data/gmmtv-next-projects.js';
import { gmmtvNextCpProfiles } from '../src/features/cp/cp-gmmtv-next-data.js';
import { profileForMember } from '../src/features/cp/member-profiles.js';
import { localizedWorkTitle } from '../src/i18n/proper-names.js';
import { filterCps } from '../src/features/cp/cp-names.js';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { timelineForCp } from '../src/features/cp/cp-timeline.js';
import { statusForCp } from '../src/features/cp/cp-status.js';

const archive = new Map(archiveDramas.map(work => [work.id, work]));
test('GMMTV NEXT announcements have official posters and no invented release dates', () => {
  assert.equal(gmmtvNextProjects.length, 9);
  assert.equal(new Set(gmmtvNextProjects.map(work => work.id)).size, 9);
  for (const project of gmmtvNextProjects) {
    assert.ok(!archive.has(project.id));
    for (const field of ['year', 'date', 'premiereDate']) assert.equal(project[field], undefined);
    assert.equal(project.announcedAt, '2026-11-03');
    assert.equal(project.imageKind, 'poster');
    assert.equal(project.imageFit, 'contain');
    assert.ok(project.posterSource.startsWith('https://x.com/GMMTV/status/'));
    assert.equal(new URL(project.imageSource).hostname, 'pbs.twimg.com');
    for (const cpId of project.cpIds) {
      const cp = findCp(cpId);
      assert.equal(cp.upcoming.filter(work => work.id === project.id).length, 1);
      assert.ok(!cp.works.some(work => work.id === project.id));
      assert.equal(statusForCp(cpId).status, 'active');
      const event = timelineForCp(cp).find(item => item.workId === project.id);
      assert.equal(event.date, null);
      assert.equal(localizedWorkTitle(event, 'th'), project.titleTh);
    }
  }
});

test('Be Mine has one shared project and four distinct chapters and related CP links', () => {
  const chapters = { emibonnie:'Be My Sugar', kapookciize:'Be My Baby', sangtacare:'Be My Boo', yoghurtpang:'More & More' };
  assert.deepEqual(new Set(cpsForWork('be-mine').map(cp => cp.id)), new Set(Object.keys(chapters)));
  const posters = new Set();
  for (const [id, chapter] of Object.entries(chapters)) {
    const work = findCp(id).upcoming.find(work => work.id === 'be-mine');
    assert.equal(work.chapter, chapter);
    posters.add(work.image);
  }
  assert.equal(posters.size, 1);
  assert.deepEqual(cpsForWork('beyond-you').map(cp => cp.id), ['viewmim']);
});

test('new pairings reuse actor identities and preserve JuneMewnich historical work', () => {
  assert.equal(gmmtvNextCpProfiles.length, 6);
  const historical = findCp('junemewnich');
  assert.ok(historical.works.some(work => work.id === 'whale-store-xoxo'));
  assert.deepEqual(profileForMember(historical.members[1]), profileForMember(findCp('jaoyingmewnich').members[1]));
  assert.deepEqual(cpsForWork('loves-echoes').map(cp => cp.id), ['jaoyingmewnich']);
  for (const pair of gmmtvNextCpProfiles) for (const member of findCp(pair.id).members) {
    const profile = profileForMember(member);
    assert.equal(new URL(profile.source).hostname, 'www.gmm-tv.com');
    assert.equal(profile.sourceKind, 'agency');
    assert.equal(profile.checkedAt, '2026-11-04');
  }
});

test('built directory searches English, Thai, actors and Be Mine chapter names', () => {
  const directory = JSON.parse(readFileSync('src/features/cp/generated/index.json', 'utf8')).profiles;
  for (const project of gmmtvNextProjects) for (const query of [project.title, project.titleTh]) {
    for (const cpId of project.cpIds) assert.ok(filterCps(directory, query, archive).some(cp => cp.id === cpId), `${query}: ${cpId}`);
    assert.equal(localizedWorkTitle(project, 'th'), project.titleTh);
    assert.equal(localizedWorkTitle(project, 'zh'), project.title);
  }
  for (const [query, id] of [['Be My Boo','sangtacare'],['More & More','yoghurtpang'],['Nuttanicha Dungwattanawanich','nychaprim']]) {
    assert.ok(filterCps(directory, query, archive).some(cp => cp.id === id));
  }
});

test('selected images retain attribution, are unique WebP assets and fit the image budget', () => {
  const assets = JSON.parse(readFileSync('docs/gmmtv-next-assets.json', 'utf8'));
  assert.equal(assets.length, 15);
  assert.equal(new Set(assets.map(asset => asset.originalSha256)).size, 15);
  for (const asset of assets) {
    assert.ok(asset.source.startsWith('https://x.com/'));
    assert.match(asset.output, /\.webp$/);
    const size = statSync(`public/${asset.output}`).size;
    assert.equal(size, asset.bytes);
    assert.ok(size <= 1024 * 1024);
    assert.ok(asset.width > 0 && asset.height > 0);
  }
});
