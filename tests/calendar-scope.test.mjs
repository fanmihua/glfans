import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeStartDate } from '../src/features/archive/calendar-scope.js';

test('scoped calendar chooses the next confirmed episode and excludes other series', () => {
  const events = [{seriesId:'a',date:'2026-09-01'}, {seriesId:'b',date:'2026-09-11'}, {seriesId:'a',date:'2026-09-12',needsReview:true}, {seriesId:'a',date:'2026-09-15'}];
  assert.equal(scopeStartDate(events,['a'],'2026-09-10','Asia/Bangkok'),'2026-09-15');
  assert.equal(scopeStartDate(events,['a'],'2026-10-01','Asia/Bangkok'),'2026-09-15');
  assert.equal(scopeStartDate(events,['missing'],'2026-09-10','Asia/Bangkok'),'2026-09-10');
  assert.equal(scopeStartDate(events,undefined,'2026-09-10','Asia/Bangkok'),'2026-09-10');
});

test('scoped calendar positions episodes using the website language timezone', () => {
  const events = [{seriesId:'a',date:'2026-09-10',airsAt:'2026-09-10T16:30:00Z'}];
  assert.equal(scopeStartDate(events,['a'],'2026-09-01','Asia/Shanghai'),'2026-09-11');
  assert.equal(scopeStartDate(events,['a'],'2026-09-01','Asia/Bangkok'),'2026-09-10');
});
