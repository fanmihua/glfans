import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { historyFromFeed, applyHistoryCorrections } from '../scripts/lib/archive-history.mjs';
import { mergeCalendarData } from '../src/features/archive/calendar-data.js';
import { eventDate } from '../src/features/archive/calendar-model.js';
const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const history = await read('../src/data/archive-history.json');
const current = await read('../src/data/archive-schedule.json');
const all = mergeCalendarData(history, current);

test('dated archive titles have a verified calendar entry, with unique series and event identities', () => {
  const ids = new Set(all.events.filter((event) => !event.needsReview).map((event) => event.seriesId));
  assert.deepEqual(archiveDramas.filter(({ id, startDate }) => startDate && !ids.has(id)).map(({ id }) => id), []);
  for (const work of archiveDramas.filter(work => !work.startDate)) {
    assert.ok(work.releaseWindow && work.releaseWindowSource.startsWith('https://'), work.id);
    assert.ok(!all.events.some(event => event.seriesId === work.id), work.id);
  }
  assert.equal(new Set(all.series.map(({ id }) => id)).size, all.series.length);
  assert.equal(new Set(all.events.map(({ id }) => id)).size, all.events.length);
  for (const event of all.events) {
    assert.ok(all.series.some(({ id }) => id === event.seriesId));
    assert.ok(/^https:\/\//.test(event.sourceUrl));
    assert.equal(new Date(event.date).toISOString().slice(0, 10), event.date);
  }
});
test('GAP preserves the skipped New Year week and midnight Beijing conversion', () => {
  const episodes = history.events.filter((event) => event.seriesId === 'gap');
  assert.equal(episodes.find((event) => event.episode === 6).date, '2022-12-24');
  assert.equal(episodes.find((event) => event.episode === 7).date, '2023-01-07');
  assert.equal(episodes.some((event) => event.date === '2022-12-31'), false);
  assert.equal(eventDate(episodes.find((event) => event.episode === 7), 'Asia/Shanghai'), '2023-01-08');
});
test('seasons and anthology segments have local episode numbering without unrelated episodes', () => {
  const episodes = (id) => history.events.filter((event) => event.seriesId === id);
  assert.equal(episodes('apple-my-love').length, 6);
  assert.ok(episodes('apple-my-love').every((event) => event.date.startsWith('2024')));
  assert.equal(episodes('i-am-devil-season-2').length, 4);
  assert.equal(episodes('i-am-devil-season-2')[0].episode, 1);
  assert.equal(episodes('i-am-devil-season-2')[0].date, '2025-09-20');
  assert.deepEqual(episodes('muteluv-hello-is-this-luck').map((event) => [event.episode, event.date]),
    [[1, '2025-12-15'], [2, '2025-12-22'], [3, '2025-12-29'], [4, '2026-01-05']]);
});
test('premiere-only titles never manufacture weekly episodes; reviewed finale delay is preserved', () => {
  for (const id of ['rak-overdose', 'falling-for-my-hater']) {
    const events = history.events.filter((event) => event.seriesId === id);
    assert.equal(events.length, 1);
    assert.equal(events[0].episode, null);
    assert.equal(events[0].airsAt, null);
    assert.equal(events[0].kind, 'premiere');
  }
  const finale = history.events.find(({ id }) => id === 'blank-season-2:ep:6');
  assert.equal(finale.needsReview, false);
  assert.equal(finale.date, '2024-06-29');
  assert.equal(finale.correctedFrom.date, '2024-06-22');
  assert.equal(finale.network, 'YouTube');
});
test('weekly refresh preserves all historical dates, current corrections and review flags win', () => {
  assert.equal(mergeCalendarData(history, { ...current, events: [], series: [] }).events.length, history.events.length);
  const original = history.events[0];
  const changed = { ...original, needsReview: true, date: '2026-09-01' };
  const merged = mergeCalendarData(history, { ...current, events: [changed], series: [] });
  assert.deepEqual(merged.events.find(({ id }) => id === original.id), changed);
  assert.equal(merged.events.filter(({ id }) => id === original.id).length, 1);
});
test('history import rejects wrong identities, invalid dates, duplicate episodes and wrong anthology titles', () => {
  const mapping = { seriesId: 'sample', id: 1, name: 'Sample', premiered: '2024-01-01', language: 'Thai', season: 2, episodeNumbers: [17], numberOffset: 16, namePrefix: 'Segment' };
  const episode = { season: 2, number: 17, name: 'Segment Episode 1', airdate: '2025-01-01', airtime: '', airstamp: '2025-01-01T00:00:00Z', url: 'https://www.tvmaze.com/episodes/1/sample' };
  const show = { id: 1, name: 'Sample', premiered: '2024-01-01', language: 'Thai', _embedded: { episodes: [episode, { ...episode, season: 1 }] } };
  const archive = { id: 'sample', titleEn: 'Sample' };
  const build = (source) => historyFromFeed(mapping, source, archive, '2026-09-04T00:00:00Z');
  assert.equal(build(show).events.length, 1);
  assert.equal(build(show).events[0].episode, 1);
  assert.equal(build(show).events[0].airsAt, null);
  assert.throws(() => build({ ...show, id: 2 }));
  for (const episodes of [[{ ...episode, airdate: '2025-02-30' }], [episode, episode], [{ ...episode, name: 'Unrelated' }]]) {
    assert.throws(() => build({ ...show, _embedded: { episodes } }));
  }
});

test('reviewed delay is not overwritten by a refreshed old schedule or an unexplained third date', () => {
  const record = { events: [{ id: 'sample:ep:6', date: '2024-06-22', sourceUrl: 'https://example.com/old', needsReview: true }] };
  const correction = { id: 'sample:ep:6', expectedDate: '2024-06-22', date: '2024-06-29', sourceUrl: 'https://example.com/new', checkedAt: '2026-09-04T00:00:00Z' };
  assert.equal(applyHistoryCorrections(record, [correction]).events[0].date, '2024-06-29');
  assert.throws(() => applyHistoryCorrections({ events: [{ ...record.events[0], date: '2024-07-01' }] }, [correction]));
});

test('month availability disables empty months, deduplicates episodes and follows filtered localized dates', async () => {
  const { calendarMonthAvailability } = await import('../src/features/archive/calendar-model.js');
  const group = (events) => {
    const map = new Map();
    for (const event of events) { const date = eventDate(event, 'Asia/Shanghai'); map.set(date, [...(map.get(date) || []), event]); }
    return map;
  };
  const gap = history.events.filter((event) => event.seriesId === 'gap' && !event.needsReview);
  const months = calendarMonthAvailability(group(gap));
  assert.equal(months.has('2022-10'), false);
  assert.deepEqual(months.get('2022-11'), { count: 1, firstDate: '2022-11-20' });
  assert.deepEqual(months.get('2023-01'), { count: 1, firstDate: '2023-01-08' });
  assert.equal(months.has('2026-09'), false);
  const multiple = calendarMonthAvailability(group([...gap, { seriesId: 'another', date: '2022-11-22' }, { seriesId: 'another', date: '2022-11-29' }]));
  assert.equal(multiple.get('2022-11').count, 2);
  const midnight = calendarMonthAvailability(group([{ seriesId: 'late', date: '2022-12-31', airsAt: '2022-12-31T16:30:00Z' }]));
  assert.equal(midnight.has('2022-12'), false);
  assert.deepEqual(midnight.get('2023-01'), { count: 1, firstDate: '2023-01-01' });
  assert.equal(calendarMonthAvailability(new Map()).size, 0);
});
