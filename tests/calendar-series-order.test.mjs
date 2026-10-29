import test from 'node:test';
import assert from 'node:assert/strict';
import { sortCalendarSeriesByPremiere } from '../src/features/archive/calendar-series-order.js';

test('show selection orders known premieres newest first without changing its source', () => {
  const source = Object.freeze([
    Object.freeze({ id: 'earlier', year: '2026', premiereDate: '2026-01-19' }),
    Object.freeze({ id: 'latest', year: '2026', premiereDate: '2026-10-22' }),
    Object.freeze({ id: 'middle', year: '2026', premiereDate: '2026-09-07' }),
  ]);
  assert.deepEqual(sortCalendarSeriesByPremiere(source).map(s => s.id), ['latest', 'middle', 'earlier']);
  assert.deepEqual(source.map(s => s.id), ['earlier', 'latest', 'middle']);
});

test('reviewed archive premiere takes priority over an outdated schedule date', () => {
  const source = [
    { id: 'delayed', startDate: '2026-11-07', premiereDate: '2026-10-17' },
    { id: 'october', premiereDate: '2026-10-22' },
  ];
  assert.deepEqual(sortCalendarSeriesByPremiere(source).map(s => s.id), ['delayed', 'october']);
});

test('missing, incomplete and invalid dates remain after known dates in source order', () => {
  const source = [
    { id: 'unknown' }, { id: 'year-only', startDate: '2026' },
    { id: 'invalid', startDate: '2026-02-30' },
    { id: 'known-a', premiereDate: '2026-09-07' },
    { id: 'known-b', startDate: '2026-09-07' },
  ];
  assert.deepEqual(sortCalendarSeriesByPremiere(source).map(s => s.id), ['known-a', 'known-b', 'unknown', 'year-only', 'invalid']);
});
