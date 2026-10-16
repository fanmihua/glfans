import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { mergeCalendarData } from '../src/features/archive/calendar-data.js';
import { seriesName } from '../src/i18n/proper-names.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compareIds = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const locales = ['zh', 'en', 'th'];

function sourceTimestamp(value) {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function platformsFor(event, series) {
  return [...new Set((event?.platforms || series?.platforms || []).filter(value => typeof value === 'string' && value.trim()))];
}

// Feed generation is deliberately a projection of the website's reviewed data.
// No wall-clock timestamp, current-month window, cadence expansion or POC input.
export function buildCalendarSubscriptionData({ history, current, archives = archiveDramas }) {
  const merged = mergeCalendarData(history, current);
  const archiveById = new Map(archives.map(series => [series.id, series]));
  const seriesById = new Map(merged.series.map(series => [series.id, series]));
  const timestamps = [history.checkedAt, current.checkedAt,
    ...merged.events.flatMap(event => [event.sourceCheckedAt, event.checkedAt])].map(sourceTimestamp).filter(Boolean);
  if (!timestamps.length) throw new Error('Calendar subscription requires a reviewed source timestamp');
  const generatedAt = timestamps.sort(compareIds).at(-1);

  // All known shows remain selectable even before an eligible date is listed.
  const series = [...seriesById.values()].sort((a, b) => compareIds(a.id, b.id)).map(source => {
    const archive = archiveById.get(source.id);
    return {
      id: source.id,
      titles: Object.fromEntries(locales.map(locale => [locale, (archive && seriesName(archive, locale)) || source.name || source.id])),
      network: source.network || '',
      platforms: platformsFor(null, source),
    };
  });

  const units = new Map(merged.series.filter(series => series.episodeUnit === 'part').map(series => [series.id, 'part']));
  for (const event of merged.events) {
    if (event.episodeUnit === 'part' || event.kind === 'part' || event.id?.startsWith(`${event.seriesId}:part:`)) units.set(event.seriesId, 'part');
  }
  const records = new Map();
  for (const event of merged.events) {
    if (event.needsReview) continue;
    const source = seriesById.get(event.seriesId);
    if (!source || typeof event.id !== 'string' || !event.id) throw new Error(`Invalid subscription event identity: ${event.id}`);
    if (!validDate(event.date) || (event.airsAt && !sourceTimestamp(event.airsAt))) throw new Error(`Invalid subscription event date: ${event.id}`);
    if (!event.sourceUrl?.startsWith('https://')) throw new Error(`Invalid subscription event source: ${event.id}`);
    const premiere = event.kind === 'premiere' || event.id === `${event.seriesId}:premiere`;
    const unit = event.episodeUnit || units.get(event.seriesId) || null;
    // A date-only first airing and its subsequently timed EP1 have one UID.
    // Part-based publications use part:1, never an invented complete episode.
    const id = premiere ? `${event.seriesId}:${unit === 'part' ? 'part' : 'ep'}:1` : event.id;
    const previous = records.get(id);
    if (previous) {
      if (premiere && !previous.premiere) continue;
      if (!premiere && previous.premiere) records.delete(id);
      else throw new Error(`Duplicate subscription event identity: ${id}`);
    }
    records.set(id, { premiere, event: {
      id, sourceId: event.id, seriesId: event.seriesId,
      episode: event.episode ?? null, episodeUnit: unit,
      date: event.date, airsAt: event.airsAt ? sourceTimestamp(event.airsAt) : null,
      sourceUrl: event.sourceUrl,
      network: event.network || source.network || '',
      platforms: platformsFor(event, source),
      updatedAt: sourceTimestamp(event.sourceCheckedAt) || sourceTimestamp(event.checkedAt) || generatedAt,
    } });
  }
  const events = [...records.values()].map(record => record.event).sort((a, b) => compareIds(a.id, b.id));
  if (!events.length) throw new Error('Calendar subscription has no confirmed events; refuse an empty published feed');
  return { version: 1, generatedAt, series, events };
}

export async function writeCalendarSubscription(outputDirectory = path.join(root, 'dist/client')) {
  const read = async file => JSON.parse(await readFile(path.join(root, 'src/data', file), 'utf8'));
  const [history, current] = await Promise.all([read('archive-history.json'), read('archive-schedule.json')]);
  const data = buildCalendarSubscriptionData({ history, current });
  const destination = path.join(outputDirectory, 'calendar', 'subscription.json');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(data)}\n`);
  return { data, destination };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { data, destination } = await writeCalendarSubscription(process.argv[2] && path.resolve(process.argv[2]));
  console.log(`Calendar subscription: ${data.series.length} shows / ${data.events.length} confirmed entries -> ${destination}`);
}
