import { dateInZone } from './archive-schedule.mjs';

export function officialUpcomingForAssembly(upcoming, overrides) {
  const premieres = new Set(overrides.events.filter(event => event.kind === 'premiere').map(event => event.seriesId));
  return upcoming.map(item => premieres.has(item.slug) ? { ...item, startDate: null } : item);
}

// Explicit official records win over rolling aggregator listings. Only the
// listed dates are pinned; this never expands a weekly rule into new episodes.
export function applyOfficialScheduleOverrides(data, overrides) {
  if (overrides.version !== 1 || !Array.isArray(overrides.series) || !Array.isArray(overrides.events)) {
    throw new Error('Invalid official schedule overrides.');
  }
  const series = new Map(data.series.map(item => [item.id, item]));
  const events = new Map(data.events.map(item => [item.id, item]));
  const sourceIsOfficial = item => item.sourceProvider === 'official' && /^https:\/\//.test(item.sourceUrl || '');
  for (const item of overrides.series) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || !/^https:\/\//.test(item.sourceUrl || '')) {
      throw new Error('Invalid official series override.');
    }
    series.set(item.id, { ...series.get(item.id), ...item, sourceProvider: 'official', checkedAt: overrides.checkedAt });
  }
  for (const [id, event] of events) {
    if (series.get(event.seriesId)?.episodeUnit !== 'part' || !event.episode) continue;
    const partId = `${event.seriesId}:part:${event.episode}`;
    if (id !== partId) events.delete(id);
    events.set(partId, { ...event, id: partId, kind: 'part', episodeUnit: 'part',
      ...(!sourceIsOfficial(event) ? { needsReview: true, reviewReason: 'Part publication awaits official confirmation.' } : {}) });
  }
  for (const item of overrides.events) {
    if (!series.has(item.seriesId) || !sourceIsOfficial(item)
      || !Number.isFinite(Date.parse(item.date)) || new Date(item.date).toISOString().slice(0, 10) !== item.date
      || (item.airsAt && (!Number.isFinite(Date.parse(item.airsAt)) || dateInZone(item.airsAt) !== item.date))) {
      throw new Error('Invalid official event override.');
    }
    if (item.kind === 'premiere' && events.has(`${item.seriesId}:ep:1`)) {
      // Once a real EP1 appears, correct that record rather than reintroducing
      // a duplicate premiere. A stale pre-delay EP2 stays visible for review.
      const id = `${item.seriesId}:ep:1`;
      events.set(id, { ...events.get(id), date: item.date, airsAt: item.airsAt,
        sourceUrl: item.sourceUrl, sourceProvider: 'official', checkedAt: item.checkedAt, needsReview: false });
      events.delete(item.id);
    } else events.set(item.id, { ...events.get(item.id), ...item });
  }
  for (const [id, event] of events) {
    if (event.kind === 'premiere' && series.get(event.seriesId)?.episodeUnit === 'part'
      && events.has(`${event.seriesId}:part:1`)) events.delete(id);
  }
  for (const [id, event] of events) {
    const metadata = series.get(event.seriesId);
    if (metadata?.sourceProvider === 'official' && event.date < metadata.premiereDate) {
      events.set(id, { ...event, needsReview: true, reviewReason: 'Date precedes the officially confirmed premiere.' });
    }
  }
  data.series = [...series.values()];
  data.events = [...events.values()].sort((a, b) => a.date.localeCompare(b.date)
    || (a.airsAt || '').localeCompare(b.airsAt || '') || (a.episode || 0) - (b.episode || 0));
  return data;
}
