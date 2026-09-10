import { eventDate } from './calendar-model.js';

// Prefer the next published episode; past-only series open at their last record.
export function scopeStartDate(events, seriesIds, today, zone) {
  if (!seriesIds?.length) return today;
  const ids = new Set(seriesIds);
  const dates = events.filter(event => !event.needsReview && ids.has(event.seriesId))
    .map(event => eventDate(event, zone)).sort();
  return dates.find(date => date >= today) || dates[dates.length - 1] || today;
}
