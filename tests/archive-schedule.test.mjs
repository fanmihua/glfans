import test from 'node:test';
import assert from 'node:assert/strict';
import { readPayloadList, assembleSchedule } from '../scripts/lib/archive-schedule.mjs';
import { calendarDate, eventDate, eventStatus, scheduleStats, monthDates, moveDate } from '../src/features/archive/calendar-model.js';
import { applyOfficialScheduleOverrides, officialUpcomingForAssembly } from '../scripts/lib/archive-schedule-overrides.mjs';

const checkedAt = '2026-09-04T12:00:00Z';
const series = { slug: 'example-series', name: 'Example', country: 'Thailand', network: 'TV', platforms: [{ name: 'Stream' }] };
const fixture = () => [{ url: 'https://glspotlight.com/airing', days: Array.from({ length: 7 }, (_, index) => ({ dateKey: moveDate('2026-08-31', index), entries: index === 4 ? [{ airsAt: '2026-09-04T13:30:00Z', episodeNumber: 1, series }] : [] })) }];
const upcoming = [{ ...series, startDate: '2026-09-04T00:00:00Z' }];
test('public payload JSON parsing handles escaped quotes and nesting without executing scripts', () => {
  const chunk = `1:${JSON.stringify({ seriesByDay: [{ text: 'a ] " quote', entries: [1] }] })}\n`;
  const html = `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`;
  assert.deepEqual(readPayloadList(html, 'seriesByDay'), [{ text: 'a ] " quote', entries: [1] }]);
  assert.throws(() => readPayloadList('<html>temporarily unavailable</html>', 'seriesByDay'));
});
test('date-only premieres are not fabricated midnight episode records; premiere deduplicates against EP1', () => {
  const { data } = assembleSchedule(fixture(), [...upcoming, { slug: 'new-series', name: 'New', startDate: '2026-10-17T00:00:00Z' }], null, checkedAt);
  assert.equal(data.events.length, 2);
  assert.equal(data.events[1].airsAt, null);
  assert.equal(data.events[1].episode, null);
  assert.equal(eventDate(data.events[1], 'Asia/Shanghai'), '2026-10-17');
  assert.equal(eventStatus(data.events[1], Date.parse('2027-01-01')), 'aired');
});
test('cross-midnight broadcasts use the selected time zone and transition at the scheduled instant', () => {
  const event = { airsAt: '2026-09-04T16:30:00Z' };
  assert.equal(calendarDate(event.airsAt, 'Asia/Bangkok'), '2026-09-04');
  assert.equal(calendarDate(event.airsAt, 'Asia/Shanghai'), '2026-09-05');
  const starts = Date.parse(event.airsAt);
  assert.equal(eventStatus(event, starts - 1), 'upcoming');
  assert.equal(eventStatus(event, starts), 'aired');
  assert.equal(eventStatus({ ...event, needsReview: true }, starts), 'review');
});
test('repeat sync does not duplicate; a missing episode is retained for review and a moved episode is reported', () => {
  const first = assembleSchedule(fixture(), upcoming, null, checkedAt);
  const repeated = assembleSchedule(fixture(), upcoming, first.data, checkedAt);
  assert.equal(repeated.data.events.length, 1);
  assert.deepEqual(repeated.changes.added, []);
  const missing = fixture(); missing[0].days[4].entries = [];
  const result = assembleSchedule(missing, [], first.data, checkedAt);
  assert.equal(result.data.events[0].needsReview, true);
  const moved = fixture(); moved[0].days[4].entries[0].airsAt = '2026-09-04T14:30:00Z';
  assert.equal(assembleSchedule(moved, upcoming, first.data, checkedAt).changes.changed.length, 1);
});
test('rolling source windows preserve verified series metadata and catalogue order', () => {
  const first = assembleSchedule(fixture(), upcoming, null, checkedAt);
  const partial = fixture();
  partial[0].days[4].entries[0].series = { slug: series.slug, name: series.name };
  const result = assembleSchedule(partial, [], first.data, checkedAt);
  assert.deepEqual(result.data.series.map((item) => item.id), first.data.series.map((item) => item.id));
  assert.deepEqual(result.data.series[0], first.data.series[0]);
});
test('invalid source dates, stale windows and conflicting premiere dates fail closed', () => {
  const invalid = fixture(); invalid[0].days[4].entries[0].airsAt = 'not-a-date';
  assert.throws(() => assembleSchedule(invalid, upcoming, null, checkedAt));
  assert.throws(() => assembleSchedule(fixture(), upcoming, null, '2026-10-01T00:00:00Z'));
  assert.throws(() => assembleSchedule(fixture(), [{ ...series, startDate: '2026-09-05T00:00:00Z' }], null, checkedAt));
});
test('month cells cover complete Monday-first weeks, including a six-row month', () => {
  const dates = monthDates('2026-08-15');
  assert.equal(dates.length, 42);
  assert.equal(dates[0], '2026-07-27');
  assert.equal(dates.at(-1), '2026-09-06');
});

test('date-only premieres use the source day and statistics exclude review records from calendar dates', () => {
  const premiere = { seriesId: 'new', date: '2026-09-05', airsAt: null };
  assert.equal(eventStatus(premiere, Date.parse('2026-09-04T16:30:00Z')), 'upcoming');
  assert.equal(eventStatus(premiere, Date.parse('2026-09-04T17:00:00Z')), 'airingToday');
  assert.equal(eventStatus(premiere, Date.parse('2026-09-05T17:00:00Z')), 'aired');
  const rows = [premiere, { seriesId: 'example', airsAt: '2026-09-04T17:00:00Z' },
    { seriesId: 'example', airsAt: '2026-09-04T18:00:00Z' }, { ...premiere, needsReview: true }];
  const stats = scheduleStats(rows, Date.parse('2026-09-04T17:30:00Z'));
  assert.deepEqual(stats.totals, { aired: 1, upcoming: 1, airingToday: 1, review: 1 });
  assert.equal(stats.dates.length, 1);
  assert.equal(stats.dates[0].series, 2);
  assert.equal(stats.dates[0].events, 3);
});

test('full episode feeds add dated later episodes, retain exact primary times and never use fallback stamps', async () => {
  const { mergeEpisodeSchedules } = await import('../scripts/lib/archive-episode-sources.mjs');
  const mapping = { id: 123, name: 'Example', seriesId: 'example-series' };
  const episode = (number, airdate, airtime = '20:30') => ({ season: 1, number, airdate, airtime,
    airstamp: `${airdate}T13:30:00Z`, url: `https://www.tvmaze.com/episodes/${number}/example` });
  const feeds = [{ mapping, show: { id: 123, name: 'Example', language: 'Thai', _embedded: { episodes: [
    episode(1, '2026-09-04'), episode(2, '2026-09-11', ''), episode(3, '2026-09-18'), { season: 1, number: 4, airdate: '' },
  ] } } }];
  const fresh = () => assembleSchedule(fixture(), upcoming, null, checkedAt).data;
  const merged = mergeEpisodeSchedules(fresh(), feeds);
  assert.equal(merged.events.length, 3);
  assert.equal(merged.events[0].sourceProvider, undefined);
  assert.equal(merged.events[1].airsAt, null);
  assert.equal(merged.events[1].episode, 2);
  assert.equal(merged.events[2].date, '2026-09-18');
  assert.deepEqual(mergeEpisodeSchedules(fresh(), feeds, merged), merged);
  const changed = structuredClone(feeds);
  changed[0].show._embedded.episodes[0].airdate = '2026-09-05';
  changed[0].show._embedded.episodes[0].airstamp = '2026-09-05T13:30:00Z';
  assert.equal(mergeEpisodeSchedules(fresh(), changed).events[0].needsReview, true);
  changed[0].show._embedded.episodes.pop();
  changed[0].show._embedded.episodes.pop();
  const missing = mergeEpisodeSchedules(fresh(), changed, merged);
  assert.equal(missing.events.find((event) => event.episode === 3).needsReview, true);
  changed[0].show.id = 456;
  assert.throws(() => mergeEpisodeSchedules(fresh(), changed));
});

test('official postponed premieres survive stale dates, blank channels and repeated refreshes', () => {
  const first = assembleSchedule(fixture(), [{ slug: 'delayed-series', name: 'Delayed', startDate: '2026-10-17' }], null, checkedAt).data;
  const overrides = { version: 1, checkedAt, series: [{ id: 'delayed-series', name: 'Delayed', network: 'iQIYI',
    platforms: ['iQIYI'], premiereDate: '2026-11-07', sourceUrl: 'https://x.com/MGIBeyond/status/2103084608183296422' }],
  events: [{ id: 'delayed-series:premiere', seriesId: 'delayed-series', episode: null, kind: 'premiere', date: '2026-11-07',
    airsAt: '2026-11-07T13:00:00Z', sourceProvider: 'official', sourceUrl: 'https://x.com/MGIBeyond/status/2103084608183296422', checkedAt, needsReview: false }] };
  applyOfficialScheduleOverrides(first, overrides);
  const second = assembleSchedule(fixture(), [{ slug: 'delayed-series', name: 'Delayed', startDate: '2026-10-17', platforms: [] }], first, checkedAt).data;
  applyOfficialScheduleOverrides(second, overrides);
  assert.deepEqual(second.series.find(item => item.id === 'delayed-series').platforms, ['iQIYI']);
  assert.equal(second.series.find(item => item.id === 'delayed-series').premiereDate, '2026-11-07');
  assert.equal(second.events.find(item => item.seriesId === 'delayed-series').airsAt, '2026-11-07T13:00:00Z');
  assert.equal(second.events.some(item => item.seriesId === 'delayed-series' && item.date === '2026-10-17'), false);
  assert.deepEqual(applyOfficialScheduleOverrides(structuredClone(second), overrides), second);
});

test('official premiere corrects a real EP1, reviews pre-premiere rows and does not manufacture later episodes', () => {
  const data = { series: [{ id: 'delayed-series', name: 'Delayed' }], events: [
    { id: 'delayed-series:ep:1', seriesId: 'delayed-series', episode: 1, kind: 'episode', date: '2026-10-17', airsAt: null },
    { id: 'delayed-series:ep:2', seriesId: 'delayed-series', episode: 2, kind: 'episode', date: '2026-10-24', airsAt: null },
  ] };
  const overrides = { version: 1, checkedAt, series: [{ id: 'delayed-series', name: 'Delayed', premiereDate: '2026-11-07', sourceUrl: 'https://example.com/official' }],
    events: [{ id: 'delayed-series:premiere', seriesId: 'delayed-series', kind: 'premiere', date: '2026-11-07', airsAt: '2026-11-07T13:00:00Z',
      sourceProvider: 'official', sourceUrl: 'https://example.com/official', checkedAt }] };
  const result = applyOfficialScheduleOverrides(data, overrides);
  assert.equal(result.events.length, 2);
  assert.equal(result.events.some(item => item.kind === 'premiere'), false);
  assert.equal(result.events.find(item => item.episode === 1).date, '2026-11-07');
  assert.equal(result.events.find(item => item.episode === 2).needsReview, true);
  assert.equal(result.events.find(item => item.episode === 2).date, '2026-10-24');
});

test('official short-series records preserve only the four published parts and reject incoherent times', async () => {
  const { readFile } = await import('node:fs/promises');
  const overrides = JSON.parse(await readFile(new URL('../src/data/archive-schedule-overrides.json', import.meta.url), 'utf8'));
  const data = applyOfficialScheduleOverrides({ series: [], events: [
    { id: 'dont-say-no-yet:ep:1', seriesId: 'dont-say-no-yet', episode: 1, kind: 'episode', date: '2026-09-22', sourceUrl: 'https://glspotlight.com/airing' },
    { id: 'dont-say-no-yet:ep:5', seriesId: 'dont-say-no-yet', episode: 5, kind: 'episode', date: '2026-10-05', sourceUrl: 'https://glspotlight.com/airing' },
  ] }, overrides);
  const parts = data.events.filter(item => item.seriesId === 'dont-say-no-yet');
  assert.deepEqual(parts.filter(item => !item.needsReview).map(item => [item.episode, item.date]), [[1, '2026-09-21'], [2, '2026-09-22'], [3, '2026-09-28'], [4, '2026-09-29']]);
  assert.ok(parts.every(item => item.kind === 'part' && item.episodeUnit === 'part'));
  assert.equal(parts.length, 5);
  assert.equal(parts.find(item => item.episode === 5).needsReview, true);
  const broken = structuredClone(overrides); broken.events[0].airsAt = '2026-11-08T13:00:00Z';
  assert.throws(() => applyOfficialScheduleOverrides({ series: [], events: [] }, broken));
});

test('stale aggregator premiere dates cannot reject an EP1 covered by an official correction', () => {
  const stale = [{ ...series, startDate: '2026-09-05' }, { slug: 'other', name: 'Other', startDate: '2026-10-01' }];
  const overrides = { events: [{ kind: 'premiere', seriesId: series.slug }] };
  const prepared = officialUpcomingForAssembly(stale, overrides);
  assert.equal(stale[0].startDate, '2026-09-05');
  assert.equal(prepared[0].startDate, null);
  assert.equal(prepared[1].startDate, '2026-10-01');
  assert.doesNotThrow(() => assembleSchedule(fixture(), prepared, null, checkedAt));
});
