import { dateInZone } from './archive-schedule.mjs';

// Verified identities: Thai series, premiere dates and overlapping episode dates
// were checked against the existing calendar before pinning these IDs.
export const episodeSources = [
  { seriesId: 'love-me-to-hurt-me', id: 95481, name: 'Love Me to Hurt Me' },
  { seriesId: 'oxytoxin', id: 88616, name: 'Oxytoxin' },
  { seriesId: 'under-her-rules', id: 89169, name: 'Under her rules' },
  { seriesId: 'built-in-love', id: 90145, name: 'Built in Love' },
  { seriesId: 'love-on-hire', id: 94865, name: 'Love on Hire' },
  { seriesId: 'moonshadow', id: 88620, name: 'Moonshadow' },
  { seriesId: 'my-lady-s-bodyguard', id: 92940, name: "My Lady's Bodyguard" },
  { seriesId: 'in-love-forever', id: 90253, name: 'In Love Forever' },
  { seriesId: 'juliet-and-juliet', id: 90630, name: 'Juliet & Juliet' },
  { seriesId: 'khom-khlang', id: 93733, name: 'Khom Khlang' },
];

export function mergeEpisodeSchedules(data, feeds, previous = null) {
  const events = new Map(data.events.map((event) => [event.id, event]));
  const seen = new Set();
  for (const { mapping, show } of feeds) {
    if (show.id !== mapping.id || show.name !== mapping.name || show.language !== 'Thai'
      || !Array.isArray(show._embedded?.episodes) || !show._embedded.episodes.length) {
      throw new Error(`Invalid episode source: ${mapping.seriesId}`);
    }
    for (const episode of show._embedded.episodes) {
      if (episode.season !== 1 || !Number.isInteger(episode.number) || episode.number < 1) continue;
      if (!episode.airdate) continue; // An undated episode is not a calendar event.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(episode.airdate)
        || !Number.isFinite(Date.parse(episode.airdate))
        || new Date(episode.airdate).toISOString().slice(0, 10) !== episode.airdate) throw new Error('Invalid episode date.');
      // TVmaze can return a fallback airstamp even when airtime is blank.
      // Preserve date and episode, but never present that fallback as a real time.
      let airsAt = null;
      if (episode.airtime) {
        if (!/^\d{2}:\d{2}$/.test(episode.airtime) || !episode.airstamp
          || !Number.isFinite(Date.parse(episode.airstamp))
          || dateInZone(episode.airstamp) !== episode.airdate) throw new Error('Invalid episode time.');
        airsAt = new Date(episode.airstamp).toISOString();
      }
      const id = `${mapping.seriesId}:ep:${episode.number}`;
      seen.add(id);
      const primary = events.get(id);
      const premiere = episode.number === 1 ? events.get(`${mapping.seriesId}:premiere`) : null;
      const premiereConflict = premiere && premiere.date !== episode.airdate;
      if (primary) {
        if (premiereConflict || primary.date !== episode.airdate || (primary.airsAt && airsAt && Date.parse(primary.airsAt) !== Date.parse(airsAt))) {
          events.set(id, { ...primary, needsReview: true });
        }
        continue;
      }
      if (!/^https:\/\/www\.tvmaze\.com\/episodes\/\d+\//.test(episode.url || '')) throw new Error('Invalid episode source URL.');
      events.set(id, { id, seriesId: mapping.seriesId, episode: episode.number, airsAt,
        date: episode.airdate, kind: 'episode', sourceUrl: episode.url,
        sourceProvider: 'tvmaze', checkedAt: data.checkedAt, needsReview: Boolean(premiereConflict) });
    }
  }
  for (const event of previous?.events || []) {
    if (event.sourceProvider === 'tvmaze' && !seen.has(event.id) && !events.has(event.id)) {
      events.set(event.id, { ...event, needsReview: true });
    }
  }
  data.events = [...events.values()].filter((event) => event.kind !== 'premiere' || !events.has(`${event.seriesId}:ep:1`))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.airsAt || '').localeCompare(b.airsAt || ''));
  return data;
}
