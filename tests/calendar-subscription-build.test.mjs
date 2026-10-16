import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { buildCalendarSubscriptionData } from '../scripts/build-calendar-subscription.mjs';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { mergeCalendarData } from '../src/features/archive/calendar-data.js';
import { seriesName } from '../src/i18n/proper-names.js';

const runFile = promisify(execFile);
const checkedAt = '2026-10-12T02:02:09.853Z';
const show = (id = 'example', extra = {}) => ({ id, name: `Show ${id}`, network: 'Channel', platforms: ['Official'], ...extra });
const event = (episode = 1, extra = {}) => ({
  id: `example:ep:${episode}`, seriesId: 'example', episode,
  date: '2026-10-16', airsAt: null, sourceUrl: 'https://example.com/official', ...extra,
});
const feed = (events = [], series = [show()], extra = {}) => ({ checkedAt, series, events, ...extra });
const build = (history, current, extra = {}) => buildCalendarSubscriptionData({ history, current, archives: [], ...extra });

test('subscriptions use all confirmed merged history and future dates, with current corrections taking precedence', () => {
  const history = feed([
    event(1, { date: '2024-11-17' }),
    event(2, { date: '2026-10-16', airsAt: '2026-10-16T13:00:00Z' }),
  ]);
  const current = feed([
    event(2, { date: '2026-10-23', airsAt: '2026-10-23T20:00:00+07:00' }),
    event(3, { date: '2027-01-01' }),
    event(4, { date: '2027-01-08', needsReview: true }),
  ]);
  const data = build(history, current);
  assert.deepEqual(data.events.map(record => [record.id, record.date, record.airsAt]), [
    ['example:ep:1', '2024-11-17', null],
    ['example:ep:2', '2026-10-23', '2026-10-23T13:00:00.000Z'],
    ['example:ep:3', '2027-01-01', null],
  ]);
});

test('all known series remain selectable, including shows with no confirmed dates, with website title fallbacks', () => {
  const archive = archiveDramas.find(record => record.id === 'khom-khlang');
  assert.ok(archive);
  const history = feed([event()], [show(), show('waiting'), show(archive.id)]);
  const current = feed([
    event(1, { id: 'review-only:ep:1', seriesId: 'review-only', needsReview: true }),
  ], [show('review-only')]);
  const data = buildCalendarSubscriptionData({ history, current });
  assert.deepEqual(data.series.map(record => record.id), ['example', archive.id, 'review-only', 'waiting'].sort());
  assert.deepEqual(data.series.find(record => record.id === archive.id).titles,
    Object.fromEntries(['zh', 'en', 'th'].map(locale => [locale, seriesName(archive, locale)])));
  assert.deepEqual(data.series.find(record => record.id === 'waiting').titles,
    { zh: 'Show waiting', en: 'Show waiting', th: 'Show waiting' });
  assert.ok(data.series.every(record => Object.values(record.titles).every(title => typeof title === 'string' && title.length)));
});

test('a date-only premiere upgraded to a rescheduled timed EP1 keeps the subscription identity', () => {
  const premiere = event(null, { id: 'example:premiere', kind: 'premiere' });
  const before = build(feed(), feed([premiere])).events[0];
  const corrected = event(1, { date: '2026-10-23', airsAt: '2026-10-23T13:00:00Z' });
  const after = build(feed([premiere]), feed([corrected])).events;
  assert.equal(before.id, 'example:ep:1');
  assert.equal(before.sourceId, 'example:premiere');
  assert.equal(after.length, 1);
  assert.equal(after[0].id, before.id);
  assert.equal(after[0].sourceId, 'example:ep:1');
  assert.equal(after[0].date, '2026-10-23');
  assert.equal(after[0].airsAt, '2026-10-23T13:00:00.000Z');
});

test('part-based first airings use part identities and prefer the explicit part over a parallel premiere', () => {
  const series = [show('example', { episodeUnit: 'part' })];
  const premiere = event(null, { id: 'example:premiere', kind: 'premiere', date: '2026-10-23' });
  const before = build(feed([], series), feed([premiere], series)).events[0];
  const part = event(1, { id: 'example:part:1', kind: 'part', episodeUnit: 'part', date: '2026-10-16' });
  const after = build(feed([premiere], series), feed([part], series)).events;
  assert.equal(before.id, 'example:part:1');
  assert.equal(after.length, 1);
  assert.equal(after[0].id, before.id);
  assert.equal(after[0].sourceId, 'example:part:1');
  assert.equal(after[0].episodeUnit, 'part');
  assert.equal(after[0].date, '2026-10-16');
  // The shared website merger keeps both raw identities; the subscription projection removes the collision.
  assert.equal(mergeCalendarData(feed([premiere], series), feed([part], series)).events.length, 2);
});

test('source timestamps drive stable publication and event revision dates without invented times or duration', () => {
  const data = build(feed([event(1)]), feed([
    event(2, { checkedAt: '2026-10-15T20:00:00Z' }),
    event(3, { checkedAt: '2026-10-16T00:00:00Z', sourceCheckedAt: '2026-10-16T08:43:33+08:00', platforms: ['Official', 'Official'] }),
  ]));
  assert.equal(data.generatedAt, '2026-10-16T00:43:33.000Z');
  assert.deepEqual(data.events.map(record => record.updatedAt), [
    '2026-10-16T00:43:33.000Z', '2026-10-15T20:00:00.000Z', '2026-10-16T00:43:33.000Z',
  ]);
  assert.ok(data.events.every(record => record.airsAt === null));
  assert.ok(data.events.every(record => !('duration' in record) && !('endAt' in record)));
  assert.deepEqual(data.events[0].platforms, ['Official']);
  assert.deepEqual(data.events[2].platforms, ['Official']);
  assert.deepEqual(build(feed(), feed([event()], [show()], { checkedAt: '2026-10-12T09:02:09.853+07:00' })),
    build(feed(), feed([event()])));
});

test('invalid sources, malformed dates, missing review timestamps and a global empty feed fail publication', () => {
  assert.throws(() => build(feed(), feed()), /no confirmed events/);
  assert.throws(() => build(feed(), feed([event(1, { needsReview: true })])), /no confirmed events/);
  assert.throws(() => build(feed([], [], { checkedAt: null }), feed([event()], [show()], { checkedAt: null })), /reviewed source timestamp/);
  assert.throws(() => build(feed(), feed([event(1, { sourceUrl: 'file:///poc.ics' })])), /event source/);
  assert.throws(() => build(feed(), feed([event(1, { date: '2026-02-30' })])), /event date/);
  assert.throws(() => build(feed(), feed([event(1, { airsAt: '2026-10-16T13:00:00' })])), /event date/);
  assert.throws(() => build(feed(), feed([event(1, { seriesId: 'unknown' })])), /event identity/);
});

test('the real reviewed source projects every eligible airing once, retaining Mom Ped Sawan EP5 as date-only', async () => {
  const read = async name => JSON.parse(await readFile(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
  const [history, current] = await Promise.all([read('archive-history.json'), read('archive-schedule.json')]);
  const merged = mergeCalendarData(history, current);
  const data = buildCalendarSubscriptionData({ history, current });
  const eligible = merged.events.filter(record => !record.needsReview);
  assert.equal(data.events.length, eligible.length);
  assert.equal(new Set(data.events.map(record => record.id)).size, eligible.length);
  assert.deepEqual(data.series.map(record => record.id), [...new Set(merged.series.map(record => record.id))].sort());
  assert.ok(data.events.every(record => !/:premiere$/.test(record.id) && !/\d{4}-\d{2}-\d{2}/.test(record.id)));
  assert.ok(data.events.every(record => eligible.some(source => source.id === record.sourceId)));
  assert.equal(data.events.filter(record => record.seriesId === 'mom-ped-sawan').length, 30);
  assert.equal(data.events.find(record => record.id === 'mom-ped-sawan:ep:5').airsAt, null);
});

test('two CLI generations produce identical bytes and build writes the file after all preparers', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'glfans-calendar-build-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const script = new URL('../scripts/build-calendar-subscription.mjs', import.meta.url);
  const first = path.join(directory, 'first');
  const second = path.join(directory, 'second');
  await runFile(process.execPath, [script.pathname, first]);
  await runFile(process.execPath, [script.pathname, second]);
  const [a, b] = await Promise.all([first, second].map(output => readFile(path.join(output, 'calendar/subscription.json'), 'utf8')));
  assert.equal(a, b);
  assert.equal(JSON.parse(a).version, 1);
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.scripts.build.endsWith('node scripts/build-calendar-subscription.mjs'));
});
