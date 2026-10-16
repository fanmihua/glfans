import { calendarDate } from '../../src/features/archive/calendar-model.js';

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

// Pinned show identities, seasons and anthology episode ranges are reviewed by
// a maintainer. Search results never become production mappings automatically.
export function historyFromFeed(mapping, show, archive, checkedAt) {
  if (!archive || archive.id !== mapping.seriesId || show.id !== mapping.id || show.name !== mapping.name
    || show.premiered !== mapping.premiered || show.language !== mapping.language
    || !Array.isArray(show._embedded?.episodes)) throw new Error(`History identity mismatch: ${mapping.seriesId}`);
  const episodes = show._embedded.episodes.filter((episode) => episode.season === mapping.season
    && Number.isInteger(episode.number) && episode.number > 0
    && (!mapping.episodeNumbers || mapping.episodeNumbers.includes(episode.number)));
  const seen = new Set();
  const events = episodes.filter((episode) => episode.airdate).map((episode) => {
    if (!validDate(episode.airdate) || !/^https:\/\/www\.tvmaze\.com\/episodes\/\d+\//.test(episode.url || '')
      || (mapping.namePrefix && !episode.name.startsWith(mapping.namePrefix))) throw new Error(`Invalid historical episode: ${mapping.seriesId}`);
    const number = episode.number - (mapping.numberOffset || 0);
    if (number < 1 || seen.has(number)) throw new Error(`Duplicate episode: ${mapping.seriesId}`);
    seen.add(number);
    let airsAt = null;
    if (episode.airtime) {
      const zone = show.network?.country?.timezone || show.webChannel?.country?.timezone || 'Asia/Bangkok';
      if (!/^\d{2}:\d{2}$/.test(episode.airtime) || !Number.isFinite(Date.parse(episode.airstamp))
        || calendarDate(episode.airstamp, zone) !== episode.airdate) throw new Error(`Invalid historical time: ${mapping.seriesId}`);
      airsAt = new Date(episode.airstamp).toISOString();
    }
    const needsReview = mapping.reviewEpisodes?.includes(episode.number) || false;
    return { id: `${mapping.seriesId}:ep:${number}`, seriesId: mapping.seriesId, episode: number, date: episode.airdate, airsAt,
      kind: 'episode', sourceUrl: episode.url, sourceProvider: 'tvmaze', checkedAt, needsReview,
      ...(needsReview ? { reviewReason: mapping.reviewReason } : {}) };
  });
  if (!events.length) throw new Error(`No dated historical episodes: ${mapping.seriesId}`);
  const channel = show.network || show.webChannel;
  return { series: { id: archive.id, name: archive.titleEn, network: channel?.name || '', platforms: archive.platforms || [],
    premiereDate: events.find((event) => event.episode === 1)?.date || null, sourceUrl: show.url }, events };
}

export function premiereRecord(archive, premiere) {
  if (!archive || archive.id !== premiere.seriesId || !validDate(premiere.date) || !premiere.sourceUrl.startsWith('https://glspotlight.com/series/')) throw new Error('Invalid historical premiere');
  return { series: { id: archive.id, name: archive.titleEn, network: '', platforms: archive.platforms || [], premiereDate: premiere.date, sourceUrl: premiere.sourceUrl },
    events: [{ id: `${archive.id}:premiere`, seriesId: archive.id, episode: null, date: premiere.date, airsAt: null, kind: 'premiere',
      sourceUrl: premiere.sourceUrl, sourceProvider: 'glspotlight', checkedAt: premiere.checkedAt, needsReview: false }] };
}

// Explicit dates copied from a broadcaster's episode index. They remain
// separate from rolling feeds so refreshes cannot replace them with a cadence.
export function officialHistoryRecord(archive, source) {
  if (!archive || archive.id !== source.seriesId || !source.checkedAt
    || !source.sourceUrl?.startsWith('https://') || !source.sourceProvider
    || !Array.isArray(source.episodes) || !source.episodes.length) throw new Error('Invalid official history source');
  const seen = new Set();
  const events = source.episodes.map((episode) => {
    if (!Number.isInteger(episode.episode) || episode.episode < 1 || seen.has(episode.episode)
      || !validDate(episode.date) || !episode.sourceUrl?.startsWith('https://')
      || (episode.airsAt && (!Number.isFinite(Date.parse(episode.airsAt))
        || calendarDate(episode.airsAt, source.sourceTimeZone) !== episode.date))) {
      throw new Error(`Invalid official historical episode: ${source.seriesId}`);
    }
    seen.add(episode.episode);
    return { id: `${source.seriesId}:ep:${episode.episode}`, seriesId: source.seriesId, ...episode,
      airsAt: episode.airsAt || null, kind: 'episode', sourceProvider: source.sourceProvider,
      checkedAt: source.checkedAt, needsReview: false };
  });
  return { series: { id: archive.id, name: archive.titleEn, network: source.network || '',
    platforms: archive.platforms || [], premiereDate: events.find((event) => event.episode === 1)?.date || null,
    sourceUrl: source.sourceUrl }, events };
}

// Reviewed corrections survive subsequent refreshes. If the upstream source
// changes to a third date, stop for review instead of silently overwriting it.
export function applyHistoryCorrections(record, corrections) {
  return { ...record, events: record.events.map((event) => {
    const correction = corrections.find(({ id }) => id === event.id);
    if (!correction) return event;
    if (![correction.expectedDate, correction.date].includes(event.date) || !validDate(correction.date)
      || !correction.sourceUrl?.startsWith('https://') || !correction.checkedAt
      || (correction.airsAt && (!Number.isFinite(Date.parse(correction.airsAt)) || calendarDate(correction.airsAt, 'Asia/Bangkok') !== correction.date))) {
      throw new Error(`Historical correction needs review: ${event.id}`);
    }
    const { expectedDate, reason, ...patch } = correction;
    const { reviewReason, ...original } = event;
    return { ...original, ...patch, needsReview: false, correctedFrom: { date: expectedDate, sourceUrl: event.sourceUrl }, correctionReason: reason };
  }) };
}
