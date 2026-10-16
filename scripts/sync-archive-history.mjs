import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { historyFromFeed, premiereRecord, officialHistoryRecord, applyHistoryCorrections } from './lib/archive-history.mjs';

const root = new URL('../', import.meta.url);
const read = async (path) => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const mappings = await read('scripts/lib/archive-history-sources.json');
const premieres = await read('scripts/lib/archive-history-premieres.json');
const corrections = await read('scripts/lib/archive-history-corrections.json');
const officialSources = await read('scripts/lib/archive-history-official.json');
const cacheIndex = process.argv.indexOf('--cache-dir');
const cache = cacheIndex < 0 ? null : process.argv[cacheIndex + 1];
if (cacheIndex >= 0 && !cache) throw new Error('--cache-dir requires a directory of reviewed API responses.');
const byId = new Map(archiveDramas.map((series) => [series.id, series]));
const checkedAt = new Date().toISOString();
const feeds = new Map(), records = [], differences = [];
for (const mapping of mappings) {
  if (!feeds.has(mapping.id)) {
    if (cache) feeds.set(mapping.id, JSON.parse(await readFile(resolve(cache, `show-${mapping.id}.json`), 'utf8')));
    else {
      const response = await fetch(`https://api.tvmaze.com/shows/${mapping.id}?embed=episodes`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`TVmaze ${mapping.id}: ${response.status}; existing history is untouched.`);
      feeds.set(mapping.id, await response.json());
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
  const archive = byId.get(mapping.seriesId);
  const record = applyHistoryCorrections(historyFromFeed(mapping, feeds.get(mapping.id), archive, checkedAt), corrections);
  records.push(record);
  const dates = record.events.map((event) => event.date).sort();
  if (archive.episodes !== record.events.length || archive.startDate !== dates[0] || archive.endDate !== dates.at(-1)) {
    differences.push({ seriesId: archive.id, archive: { episodes: archive.episodes, first: archive.startDate, last: archive.endDate },
      source: { episodes: record.events.length, first: dates[0], last: dates.at(-1) }, sourceUrl: record.series.sourceUrl });
  }
}
for (const premiere of premieres) records.push(premiereRecord(byId.get(premiere.seriesId), premiere));
for (const source of officialSources) records.push(officialHistoryRecord(byId.get(source.seriesId), source));
const data = { version: 1, checkedAt, sourceTimeZone: 'Asia/Bangkok', source: 'TVmaze, GL Spotlight and reviewed official episode pages',
  series: records.map((record) => record.series), events: records.flatMap((record) => record.events).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) };
if (new Set(data.series.map(({ id }) => id)).size !== data.series.length || new Set(data.events.map(({ id }) => id)).size !== data.events.length) throw new Error('Duplicate history identities.');
await mkdir(new URL('output/', root), { recursive: true });
await writeFile(new URL('output/archive-history-report.json', root), JSON.stringify({ checkedAt, series: data.series.length,
  episodeSeries: mappings.length, premiereOnly: premieres.map((item) => item.seriesId), events: data.events.length,
  review: data.events.filter((event) => event.needsReview), differences }, null, 2) + '\n');
// The weekly sync writes a different file. Only replace history after every feed
// validates; a failed fetch or mapping cannot wipe previously published history.
const destination = new URL('src/data/archive-history.json', root);
await writeFile(new URL('src/data/archive-history.json.tmp', root), JSON.stringify(data, null, 2) + '\n');
await rename(new URL('src/data/archive-history.json.tmp', root), destination);
console.log(JSON.stringify({ series: data.series.length, events: data.events.length, premiereOnly: premieres.length, review: data.events.filter((event) => event.needsReview).length, differences: differences.length }));
