import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { officialHistoryRecord } from '../scripts/lib/archive-history.mjs';
import { eventDate } from '../src/features/archive/calendar-model.js';
import { archiveSearchResults } from '../src/features/archive/archive-search.js';
import { localizedWorkTitle, seriesName } from '../src/i18n/proper-names.js';

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const sources = await read('../scripts/lib/archive-history-official.json');
const history = await read('../src/data/archive-history.json');
const drama = archiveDramas.find(({ id }) => id === 'mom-ped-sawan');
const source = sources.find(({ seriesId }) => seriesId === drama.id);

test('Mom Ped Sawan counts story episodes separately from the two official specials', () => {
  const record = officialHistoryRecord(drama, source);
  assert.equal(drama.episodes, 30);
  assert.equal(drama.startDate, '2024-11-17');
  assert.equal(drama.endDate, '2025-01-25');
  assert.deepEqual(record.events.map(({ episode }) => episode), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.equal(record.events.some(({ date }) => ['2024-11-16', '2025-01-26'].includes(date)), false);
  assert.equal(record.events[1].date, '2024-11-22');
  assert.equal(record.events[4].airsAt, null, 'conflicting episode time must stay unknown');
  assert.equal(eventDate(record.events[0], 'Asia/Shanghai'), '2024-11-17');
  assert.equal(record.events[0].airsAt, '2024-11-17T13:30:00.000Z');
  assert.deepEqual(record.events, history.events.filter(({ seriesId }) => seriesId === drama.id));
  assert.deepEqual(record.series, history.series.find(({ id }) => id === drama.id));
});

test('reviewed official history rejects duplicate episodes, invalid dates and shifted timestamps', () => {
  assert.throws(() => officialHistoryRecord(drama, { ...source, episodes: [source.episodes[0], source.episodes[0]] }));
  assert.throws(() => officialHistoryRecord(drama, { ...source, episodes: [{ ...source.episodes[0], date: '2024-02-30' }] }));
  assert.throws(() => officialHistoryRecord(drama, { ...source, episodes: [{ ...source.episodes[0], airsAt: '2024-11-18T13:30:00Z' }] }));
  assert.throws(() => officialHistoryRecord(drama, { ...source, seriesId: 'another-series' }));
});

test('both Chinese titles and official Thai spelling reach the same archive identity', () => {
  for (const query of ['深宫幽情', '月下禁爱', 'MomPedSawan', 'หม่อมเป็ดสวรรค์']) {
    assert.equal(archiveSearchResults(query, archiveDramas, [])[0].id, 'drama-mom-ped-sawan');
  }
  for (const [locale, title] of Object.entries({ zh: '深宫幽情', en: 'Mom Ped Sawan', th: 'หม่อมเป็ดสวรรค์' })) {
    assert.equal(localizedWorkTitle({ id: drama.id, title: drama.titleEn }, locale), title);
    assert.equal(seriesName(drama, locale), title);
  }
});
