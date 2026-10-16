const CRLF = '\r\n';
const encoder = new TextEncoder();

// Consume the same localized and filtered dates as the visible calendar.
// Adjacent-month cells in a desktop grid are not part of the selected month.
export function calendarExportEvents(eventsByDate, month) {
  const events = new Map();
  for (const [date, entries] of [...eventsByDate].sort(([a], [b]) => a.localeCompare(b))) {
    if (date.slice(0, 7) !== month) continue;
    for (const event of entries) {
      if (!event.needsReview) events.set(event.id, event);
    }
  }
  return [...events.values()];
}

export function escapeCalendarText(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// RFC 5545 limits physical lines to 75 UTF-8 octets, including the continuation
// space. Iterate code points so a fold never cuts a multibyte character.
export function foldCalendarLine(value) {
  let line = '', bytes = 0;
  const lines = [];
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      lines.push(line);
      line = ' ';
      bytes = 1;
    }
    line += character;
    bytes += size;
  }
  lines.push(line);
  return lines.join(CRLF);
}

function utcTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid calendar timestamp');
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function eventStart(event) {
  if (event.airsAt) {
    if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(event.airsAt)) throw new Error('Calendar timestamps require an explicit time zone');
    return `DTSTART:${utcTimestamp(event.airsAt)}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)
    || !Number.isFinite(Date.parse(`${event.date}T00:00:00Z`))
    || new Date(`${event.date}T00:00:00Z`).toISOString().slice(0, 10) !== event.date) throw new Error('Invalid calendar date');
  return `DTSTART;VALUE=DATE:${event.date.replace(/-/g, '')}`;
}

function publicSourceUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function createCalendarExport(events, { titleFor, episodeFor, descriptionFor = () => '', calendarName = 'glfans', generatedAt = new Date() }) {
  const stamp = utcTimestamp(generatedAt);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//glfans//Airing calendar//EN', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeCalendarText(calendarName)}`];
  const seen = new Set();
  for (const event of events) {
    if (event.needsReview || seen.has(event.id)) continue;
    if (!event.id) throw new Error('Calendar events require a stable ID');
    seen.add(event.id);
    lines.push('BEGIN:VEVENT', `UID:${encodeURIComponent(event.id)}@glfans.com`, `DTSTAMP:${stamp}`, eventStart(event),
      `SUMMARY:${escapeCalendarText(`${titleFor(event.seriesId)} · ${episodeFor(event)}`)}`, 'TRANSP:TRANSPARENT');
    const description = descriptionFor(event);
    if (description) lines.push(`DESCRIPTION:${escapeCalendarText(description)}`);
    const sourceUrl = publicSourceUrl(event.sourceUrl);
    if (sourceUrl) lines.push(`URL:${sourceUrl}`);
    // A DATE with no DTEND lasts one calendar day; a DATE-TIME with no DTEND
    // only records its start. Broadcast duration is deliberately not inferred.
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldCalendarLine).join(CRLF)}${CRLF}`;
}
