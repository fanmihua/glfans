function premiereDate(series) {
  for (const date of [series.startDate, series.premiereDate]) {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
      && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date) return date;
  }
  return '';
}

// The year headings are grouped separately. Unknown premiere days follow the
// dated shows within that year, retaining their source order without guessing.
export function sortCalendarSeriesByPremiere(series) {
  return series.map((item, index) => ({ item, index, date: premiereDate(item) }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.index - b.index)
    .map(({ item }) => item);
}
