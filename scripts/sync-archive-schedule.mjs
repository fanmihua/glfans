import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readPayloadList, assembleSchedule } from './lib/archive-schedule.mjs';
import { scheduleStats } from '../src/features/archive/calendar-model.js';
import { episodeSources, mergeEpisodeSchedules } from './lib/archive-episode-sources.mjs';
import { applyOfficialScheduleOverrides, officialUpcomingForAssembly } from './lib/archive-schedule-overrides.mjs';

const target = new URL('../src/data/archive-schedule.json', import.meta.url);
const urls = ['https://glspotlight.com/airing', 'https://glspotlight.com/airing?week=next', 'https://glspotlight.com/upcoming'];
async function fetchPage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'glfans-schedule-check/1.0' } });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const body = await response.text();
  if (body.length > 4_000_000) throw new Error('Unexpectedly large source page.');
  return body;
}
try {
  const pages = await Promise.all(urls.map(fetchPage));
  const weeks = pages.slice(0, 2).map((html, index) => ({ url: urls[index], days: readPayloadList(html, 'seriesByDay') }));
  const upcoming = readPayloadList(pages[2], 'series').filter((item) => item.country === 'Thailand');
  if (!upcoming.length) throw new Error('Upcoming catalogue is empty; existing data kept.');
  let previous = null;
  try { previous = JSON.parse(await readFile(target, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const officialOverrides = JSON.parse(await readFile(new URL('../src/data/archive-schedule-overrides.json', import.meta.url), 'utf8'));
  // A stale upcoming date must not reject the current EP1 feed before the
  // official date correction can be applied below.
  const aggregateUpcoming = officialUpcomingForAssembly(upcoming, officialOverrides);
  const primaryPrevious = previous && { ...previous, events: previous.events.filter((event) => event.sourceProvider !== 'tvmaze') };
  const { data, changes } = assembleSchedule(weeks, aggregateUpcoming, primaryPrevious);
  const feeds = [];
  for (const mapping of episodeSources) {
    const body = await fetchPage(`https://api.tvmaze.com/shows/${mapping.id}?embed=episodes`);
    feeds.push({ mapping, show: JSON.parse(body) });
  }
  mergeEpisodeSchedules(data, feeds, previous);
  applyOfficialScheduleOverrides(data, officialOverrides);
  const oldEvents = new Map((previous?.events || []).map((event) => [event.id, event]));
  changes.added = data.events.filter((event) => !oldEvents.has(event.id)).map((event) => event.id);
  changes.changed = data.events.flatMap((event) => {
    const old = oldEvents.get(event.id);
    return old && (old.date !== event.date || Date.parse(old.airsAt || old.date) !== Date.parse(event.airsAt || event.date))
      ? [{ id: event.id, before: old.airsAt || old.date, after: event.airsAt || event.date }] : [];
  });
  changes.missing = data.events.filter((event) => event.needsReview).map((event) => event.id);
  const temporary = `${fileURLToPath(target)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
  await rename(temporary, target);
  const reportDir = new URL('../output/', import.meta.url);
  await mkdir(reportDir, { recursive: true });
  await writeFile(new URL('schedule-sync-report.json', reportDir), JSON.stringify({ checkedAt: data.checkedAt, changes, statistics: scheduleStats(data.events) }, null, 2));
  console.log(JSON.stringify({ checkedAt: data.checkedAt, episodes: data.events.filter((item) => item.kind === 'episode').length,
    premieres: data.events.filter((item) => item.kind === 'premiere').length, series: data.series.length, changes }, null, 2));
} catch (error) {
  console.error(`Schedule sync stopped: ${error.message}`);
  process.exitCode = 1;
}
