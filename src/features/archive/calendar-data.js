// Historical records are independent of the rolling weekly feed. Current
// records take precedence, including review flags, without deleting old dates.
import { archiveFactReviews } from '../../data/archive-fact-reviews.js';
export function mergeCalendarData(history, current) {
  const series = new Map([...history.series, ...current.series].map((item) => [item.id, item]));
  const events = new Map([...history.events, ...current.events].map((event) => [event.id, event]));
  const lastEpisode = new Map();
  for (const event of events.values()) lastEpisode.set(event.seriesId, Math.max(lastEpisode.get(event.seriesId) || 0, event.episode || 0));
  for (const [id, event] of events) {
    const review = archiveFactReviews[event.seriesId];
    if (review && ((review.fields.includes('endDate') && event.episode === lastEpisode.get(event.seriesId))
      || (review.fields.includes('startDate') && event.episode === 1)
      || (review.fields.includes('episodes') && event.episode >= 7))) {
      events.set(id, { ...event, needsReview: true, reviewReason: review.reason });
    }
  }
  return { ...current, historyCheckedAt: history.checkedAt, series: [...series.values()],
    events: [...events.values()].filter((event) => event.kind !== 'premiere'
      || !events.has(`${event.seriesId}:ep:1`))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.airsAt || '').localeCompare(b.airsAt || '') || (a.episode || 0) - (b.episode || 0)) };
}
