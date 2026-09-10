import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { cpProfiles, findCp } from '../src/features/cp/cp-data.js';
import { cpMedia, mediaForCp } from '../src/features/cp/cp-media.js';
import { cpNotices, noticeForCp, timelineForCp } from '../src/features/cp/cp-timeline.js';
import { cpJournalCopy } from '../src/features/cp/cp-journal-copy.js';

test('media are scoped to real CPs and works, with official credit and local covers', () => {
  assert.equal(new Set(cpMedia.map(item => item.id)).size, cpMedia.length);
  for (const item of cpMedia) {
    const cp = findCp(item.cpId);
    assert.ok(cp, item.id);
    if (item.workId) assert.ok(cp.works.some(work => work.id === item.workId), item.id);
    assert.ok(item.performers.length && item.publisher && item.source);
    assert.equal(item.performers.length, item.scope === 'solo' ? 1 : 2);
    assert.ok(existsSync(new URL(`../public/${item.image}`, import.meta.url)));
    assert.ok(['www.youtube.com','music.apple.com'].includes(new URL(item.source).hostname));
    if (item.date && item.scope === 'solo') assert.ok([0,1].includes(item.memberIndex), item.id);
  }
  assert.deepEqual(mediaForCp('missing'), []);
  assert.equal(cpMedia.find(item => item.id === 'BG_yN4HCr44').performers[0], 'Bonnie Pattraphus');
});

test('timelines keep member lanes after pairing and do not invent CP formation dates', () => {
  for (const cp of cpProfiles) {
    const timeline = timelineForCp(cp, mediaForCp(cp.id));
    assert.equal(new Set(timeline.map(event => event.id)).size, timeline.length);
    const dated = timeline.filter(event => event.date);
    assert.deepEqual(dated.map(event => event.date), dated.map(event => event.date).sort());
    for (const event of timeline) {
      assert.ok([0,1,'joint'].includes(event.lane), `${cp.id}/${event.id}`);
      assert.equal(new URL(event.source).protocol, 'https:');
      for (const locale of Object.keys(cpJournalCopy)) assert.ok(cpJournalCopy[locale][event.kind]);
      if (event.kind === 'sharedWork') assert.equal(event.date.length, 4);
      if (event.kind === 'pendingWork') assert.equal(event.date, null);
    }
  }
  const nf = timelineForCp(findCp('namtanfilm'), mediaForCp('namtanfilm'));
  assert.equal(nf.find(event => event.id === 'music-saSPFSwHbrk').lane, 1);
  assert.equal(nf.find(event => event.id === 'music-hsvQg5JSDHU').lane, 0);
  const other = timelineForCp(findCp('faymay'));
  assert.ok(other.every(event => event.kind !== 'pairAnnouncement'));
});

test('only explicit official joint-work conclusions enable the ending treatment', () => {
  assert.equal(noticeForCp('fayeyoko'), null, 'An agency contract ending alone cannot set a CP conclusion');
  assert.equal(noticeForCp('faymay'), null);
  assert.equal(noticeForCp('namtanfilm'), null);
  const notice = noticeForCp('graceoaey');
  assert.equal(notice.status, 'jointWorkConcluded');
  assert.equal(notice.date, '2025-12-04');
  assert.equal(notice.source, 'https://x.com/zense_more/status/1996565165555548309');
  for (const [id, item] of Object.entries(cpNotices)) {
    assert.ok(findCp(id));
    for (const locale of ['zh','en','th']) assert.ok(item.summary[locale]);
    assert.deepEqual(item.images.map(image => image.language), ['th','en']);
    for (const image of item.images) assert.ok(existsSync(new URL(`../public/${image.image}`, import.meta.url)));
  }
  assert.ok(timelineForCp(findCp('graceoaey')).some(event => event.kind === 'sharedWork' && event.workId === 'mate'));
});

test('all journal UI copy has parity and no embedded/autoplay players are introduced', () => {
  const keys = Object.keys(cpJournalCopy.zh).sort();
  assert.deepEqual(Object.keys(cpJournalCopy.en).sort(), keys);
  assert.deepEqual(Object.keys(cpJournalCopy.th).sort(), keys);
  const component = readFileSync(new URL('../src/features/cp/CpJournal.jsx', import.meta.url), 'utf8');
  assert.ok(!/<(?:iframe|audio|video)\b/.test(component));
  assert.ok(component.includes('key={item.id}'));
  assert.ok(!component.includes('CpJournalNav'));
  const page = readFileSync(new URL('../src/features/cp/CpPage.jsx', import.meta.url), 'utf8');
  assert.ok(!page.includes('CpJournalNav'));
});

test('radio links match verified playable recordings, not CP tags or fan versions', () => {
  const playlist = JSON.parse(readFileSync(new URL('../src/data/netease-playlist.json', import.meta.url), 'utf8'));
  for (const media of cpMedia.filter(item => item.radioTrackId)) {
    const track = playlist.tracks.find(item => `netease:${item.id}` === media.radioTrackId);
    assert.ok(track?.playable);
    assert.equal(track.cpId, media.cpId);
    assert.deepEqual(track.artists, media.performers);
    assert.ok(track.name.includes(media.title));
  }
});
