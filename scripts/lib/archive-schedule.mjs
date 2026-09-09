// Read public Next.js payloads as JSON only. Never execute scripts from a source page.
export function readPayloadList(html, key) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs)].flatMap((match) => {
    try { const value = JSON.parse(match[1]); return typeof value[1] === 'string' ? [value[1]] : []; }
    catch { return []; }
  }).join('');
  const marker = `"${key}":`;
  const lists = [];
  for (let at = chunks.indexOf(marker); at >= 0; at = chunks.indexOf(marker, at + marker.length)) {
    const start = at + marker.length;
    if (chunks[start] !== '[') continue;
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < chunks.length; i++) {
      const char = chunks[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '[' || char === '{') depth++;
      else if (char === ']' || char === '}') {
        if (--depth === 0) {
          lists.push(JSON.parse(chunks.slice(start, i + 1)));
          break;
        }
      }
    }
  }
  const result = lists.sort((a, b) => b.length - a.length)[0];
  if (!result?.length) throw new Error(`Source layout changed or empty ${key}; existing data kept.`);
  return result;
}

export function dateInZone(value, timeZone = 'Asia/Bangkok') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const pick = (type) => parts.find((part) => part.type === type).value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function checkSeries(series) {
  if (!series || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(series.slug) || typeof series.name !== 'string' || !series.name.trim()) {
    throw new Error('Invalid series identity; existing data kept.');
  }
}

export function assembleSchedule(weeks, upcoming, previous = null, checkedAt = new Date().toISOString()) {
  // Start with the last verified catalogue so a rolling source window cannot
  // erase stable metadata (or reorder every series) when it omits old fields.
  const catalogue = new Map((previous?.series || []).map((item) => [item.id, { ...item }]));
  const events = new Map(), coverage = [];
  const saveSeries = (raw) => {
    checkSeries(raw);
    const before = catalogue.get(raw.slug);
    catalogue.set(raw.slug, {
      id: raw.slug, name: raw.name, network: raw.network || before?.network || '',
      platforms: raw.platforms?.map((item) => item.name).filter(Boolean) || before?.platforms || [],
      premiereDate: raw.startDate ? raw.startDate.slice(0, 10) : before?.premiereDate || null,
      sourceUrl: `https://glspotlight.com/series/${raw.slug}`,
    });
  };
  for (const { days, url } of weeks) {
    if (days.length !== 7) throw new Error('Expected a full seven-day source window.');
    days.forEach((day, index) => {
      if (!validDate(day.dateKey) || !Array.isArray(day.entries)) throw new Error('Invalid source day.');
      if (index && Date.parse(day.dateKey) - Date.parse(days[index - 1].dateKey) !== 86400000) throw new Error('Nonconsecutive source dates.');
      for (const entry of day.entries) {
        saveSeries(entry.series);
        if (!Number.isInteger(entry.episodeNumber) || entry.episodeNumber < 1
          || typeof entry.airsAt !== 'string' || !/Z$|[+-]\d{2}:\d{2}$/.test(entry.airsAt)
          || !Number.isFinite(Date.parse(entry.airsAt)) || dateInZone(entry.airsAt) !== day.dateKey) throw new Error('Invalid episode date/time.');
        const id = `${entry.series.slug}:ep:${entry.episodeNumber}`;
        const event = { id, seriesId: entry.series.slug, episode: entry.episodeNumber, airsAt: entry.airsAt,
          date: day.dateKey, kind: 'episode', sourceUrl: url, checkedAt, needsReview: false };
        if (events.has(id) && events.get(id).airsAt !== event.airsAt) throw new Error(`Conflicting episode: ${id}`);
        events.set(id, event);
      }
    });
    coverage.push({ from: days[0].dateKey, to: days.at(-1).dateKey });
  }
  const today = dateInZone(checkedAt);
  if (!coverage.some((range) => range.from <= today && today <= range.to)) throw new Error('Source week is stale; existing data kept.');
  for (const raw of upcoming) {
    saveSeries(raw);
    if (!raw.startDate) continue;
    const date = raw.startDate.slice(0, 10);
    if (!validDate(date)) throw new Error('Invalid premiere date.');
    if (events.has(`${raw.slug}:ep:1`)) {
      if (events.get(`${raw.slug}:ep:1`).date !== date) throw new Error(`Conflicting premiere: ${raw.slug}`);
    } else events.set(`${raw.slug}:premiere`, { id: `${raw.slug}:premiere`, seriesId: raw.slug, episode: null,
      airsAt: null, date, kind: 'premiere', sourceUrl: `https://glspotlight.com/series/${raw.slug}`, checkedAt, needsReview: false });
  }
  const previousSeriesIds = new Set(previous?.series.map((item) => item.id));
  const changes = { added: [], changed: [], missing: [], discoveredSeries: [...catalogue.keys()].filter((id) => !previousSeriesIds.has(id)) };
  for (const event of previous?.events || []) {
    const latest = events.get(event.id);
    if (latest) {
      if (latest.date !== event.date || latest.airsAt !== event.airsAt) changes.changed.push({ id: event.id, before: event.airsAt || event.date, after: latest.airsAt || latest.date });
      continue;
    }
    if (event.kind === 'premiere' && events.has(`${event.seriesId}:ep:1`)) continue;
    const withinWindow = coverage.some((range) => range.from <= event.date && event.date <= range.to);
    // Missing records are not proof of cancellation. Retain and flag for review.
    const needsReview = event.needsReview || withinWindow || event.date >= today;
    if (needsReview) changes.missing.push(event.id);
    events.set(event.id, { ...event, needsReview });
    if (!catalogue.has(event.seriesId)) {
      const oldSeries = previous.series.find((item) => item.id === event.seriesId);
      if (oldSeries) catalogue.set(oldSeries.id, oldSeries);
    }
  }
  const oldIds = new Set(previous?.events.map((event) => event.id));
  changes.added = [...events.keys()].filter((id) => !oldIds.has(id));
  return { data: { version: 1, checkedAt, source: 'GL Spotlight', sourceTimeZone: 'Asia/Bangkok', coverage,
    series: [...catalogue.values()], events: [...events.values()].sort((a, b) => a.date.localeCompare(b.date) || (a.airsAt || '').localeCompare(b.airsAt || '')) }, changes };
}
