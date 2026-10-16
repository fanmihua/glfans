import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calendarExportEvents, createCalendarExport, escapeCalendarText, foldCalendarLine } from '../src/features/archive/calendar-export.js';
import { eventDate } from '../src/features/archive/calendar-model.js';
import { mergeCalendarData } from '../src/features/archive/calendar-data.js';

const timedEvent = { id: 'example:ep:1', seriesId: 'example', episode: 1, date: '2026-09-30', airsAt: '2026-09-30T16:30:00Z', sourceUrl: 'https://example.com/schedule' };
const dateEvent = { id: 'example:ep:2', seriesId: 'example', episode: 2, date: '2026-10-07', airsAt: null };
const options = { titleFor: () => 'Example', episodeFor: (event) => `EP. ${event.episode}`, generatedAt: '2026-10-16T03:04:05Z' };
const unfold = (value) => value.replace(/\r\n[ \t]/g, '');
const property = (ics, name) => unfold(ics).split('\r\n').filter((line) => line.startsWith(`${name}:`));

test('exports the selected month from the visible filtered map, excluding adjacent cells and review records', () => {
  const hiddenSeries = { ...dateEvent, id: 'other:ep:1', seriesId: 'other' };
  const review = { ...dateEvent, id: 'review:ep:1', needsReview: true };
  const filtered = new Map([
    ['2026-10-07', [dateEvent, review]],
    ['2026-09-30', [timedEvent]],
    ['2026-11-01', [hiddenSeries]],
  ]);
  assert.deepEqual(calendarExportEvents(filtered, '2026-10'), [dateEvent]);
  assert.deepEqual(calendarExportEvents(new Map(), '2026-10'), []);
  assert.deepEqual(calendarExportEvents(filtered, '2027-01'), []);
});

test('cross-midnight month membership follows the same China / Thailand dates as the UI', () => {
  const visibleMap = (zone) => new Map([[eventDate(timedEvent, zone), [timedEvent]]]);
  assert.deepEqual(calendarExportEvents(visibleMap('Asia/Shanghai'), '2026-10'), [timedEvent]);
  assert.deepEqual(calendarExportEvents(visibleMap('Asia/Bangkok'), '2026-09'), [timedEvent]);
  assert.deepEqual(calendarExportEvents(visibleMap('Asia/Bangkok'), '2026-10'), []);
});

test('confirmed timestamps are UTC and date-only listings remain all-day without an invented end', () => {
  const ics = createCalendarExport([timedEvent, dateEvent], options);
  assert.match(ics, /DTSTART:20260930T163000Z\r\n/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261007\r\n/);
  assert.doesNotMatch(ics, /DTEND|DURATION|TZID|VALARM|ATTENDEE|ORGANIZER/);
  assert.deepEqual(property(ics, 'DTSTAMP'), ['DTSTAMP:20261016T030405Z', 'DTSTAMP:20261016T030405Z']);
  assert.deepEqual(property(ics, 'TRANSP'), ['TRANSP:TRANSPARENT', 'TRANSP:TRANSPARENT']);
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2.0\r\n/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('offset timestamps preserve the broadcast instant and do not depend on the exporting machine time zone', () => {
  const ics = createCalendarExport([{ ...timedEvent, airsAt: '2026-10-01T00:30:00+08:00' }], options);
  assert.deepEqual(property(ics, 'DTSTART'), ['DTSTART:20260930T163000Z']);
  assert.throws(() => createCalendarExport([{ ...timedEvent, airsAt: '2026-10-01T00:30:00' }], options), /explicit time zone/);
  assert.throws(() => createCalendarExport([{ ...timedEvent, airsAt: 'not-a-dateZ' }], options), /timestamp/);
});

test('event UIDs survive time corrections, repeat exports, locale changes and filtering', () => {
  const first = createCalendarExport([timedEvent, dateEvent], options);
  const moved = createCalendarExport([{ ...timedEvent, airsAt: '2026-10-02T13:30:00Z' }], {
    ...options, titleFor: () => '镇灵', episodeFor: () => '第 1 集', generatedAt: '2026-11-16T00:00:00Z',
  });
  assert.equal(property(first, 'UID')[0], property(moved, 'UID')[0]);
  assert.equal(new Set(property(first, 'UID')).size, 2);
  assert.doesNotMatch(property(moved, 'UID')[0], /2026|镇灵/);
});

test('long Chinese, Thai and emoji text folds within 75 UTF-8 bytes and unfolds losslessly', () => {
  const text = `SUMMARY:${'镇灵 · ตอนที่ ๑๐ 🎬'.repeat(18)}`;
  const folded = foldCalendarLine(text);
  const lines = folded.split('\r\n');
  assert.ok(lines.length > 2);
  assert.ok(lines.every((line) => Buffer.byteLength(line, 'utf8') <= 75));
  assert.ok(lines.slice(1).every((line) => line.startsWith(' ')));
  assert.equal(unfold(folded), text);
  assert.equal(Buffer.from(folded).toString('utf8'), folded);
  const atBoundary = foldCalendarLine(`${'a'.repeat(74)}🙂`);
  assert.deepEqual(atBoundary.split('\r\n'), ['a'.repeat(74), ' 🙂']);
});

test('TEXT escapes punctuation and line breaks and cannot inject calendar properties', () => {
  const text = '标题, 分号; 路径\\\r\nBEGIN:VEVENT\n末行\r回车\u0000';
  assert.equal(escapeCalendarText(text), '标题\\, 分号\\; 路径\\\\\\nBEGIN:VEVENT\\n末行\\n回车');
  const ics = createCalendarExport([dateEvent], { ...options, titleFor: () => text, descriptionFor: () => text });
  assert.equal(property(ics, 'BEGIN').filter((line) => line === 'BEGIN:VEVENT').length, 1);
  assert.equal(property(ics, 'SUMMARY').length, 1);
  assert.equal(property(ics, 'DESCRIPTION').length, 1);
  assert.doesNotMatch(ics.replaceAll('\r\n', ''), /[\r\n]/);
});

test('source links retain URI punctuation while unsafe or malformed links are omitted', () => {
  const ics = createCalendarExport([{ ...dateEvent, sourceUrl: 'https://example.com/path?q=a,b;c&lang=th' }], options);
  assert.deepEqual(property(ics, 'URL'), ['URL:https://example.com/path?q=a,b;c&lang=th']);
  for (const sourceUrl of ['javascript:alert(1)', 'file:///private/example', 'not a URL']) {
    assert.deepEqual(property(createCalendarExport([{ ...dateEvent, sourceUrl }], options), 'URL'), []);
  }
});

test('duplicate and unverified events cannot be written twice or leak into the exported snapshot', () => {
  const ics = createCalendarExport([timedEvent, timedEvent, { ...dateEvent, needsReview: true }], options);
  assert.equal(property(ics, 'UID').length, 1);
  assert.equal(calendarExportEvents(new Map([['2026-09-30', [timedEvent, timedEvent]]]), '2026-09').length, 1);
  assert.throws(() => createCalendarExport([{ ...dateEvent, id: '' }], options), /stable ID/);
});

test('invalid dates are rejected, including a normalized overflow date', () => {
  for (const date of ['2026-02-30', '2026-13-01', '2026-2-03', '', undefined]) {
    assert.throws(() => createCalendarExport([{ ...dateEvent, date }], options), /Invalid calendar date/);
  }
  assert.match(createCalendarExport([{ ...dateEvent, date: '2028-02-29' }], options), /DTSTART;VALUE=DATE:20280229/);
});

test('the actual merged schedule exports every eligible event with valid physical lines and unique UIDs', async () => {
  const readData = async (name) => JSON.parse(await readFile(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
  const [history, current] = await Promise.all([readData('archive-history.json'), readData('archive-schedule.json')]);
  const schedule = mergeCalendarData(history, current);
  const ics = createCalendarExport(schedule.events, {
    ...options, titleFor: (id) => schedule.series.find((series) => series.id === id)?.name || id,
    descriptionFor: (event) => event.sourceUrl || '',
  });
  const uids = property(ics, 'UID');
  assert.equal(uids.length, schedule.events.filter((event) => !event.needsReview).length);
  assert.equal(new Set(uids).size, uids.length);
  assert.ok(ics.split('\r\n').every((line) => Buffer.byteLength(line, 'utf8') <= 75));
  assert.doesNotMatch(ics.replaceAll('\r\n', ''), /[\r\n]/);
});
