import test from 'node:test';
import assert from 'node:assert/strict';
import { readPayloadList, assembleSchedule } from '../scripts/lib/archive-schedule.mjs';
import { calendarDate, eventDate, eventStatus, scheduleStats, monthDates, moveDate } from '../src/features/archive/calendar-model.js';

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
