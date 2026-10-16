import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCalendarSubscription, calendarSubscriptionLinks } from '../src/features/archive/calendar-subscription.js';
import { calendarCopy } from '../src/features/archive/calendar-copy.js';

test('all-show subscriptions have no series or month parameter and retain each supported language', () => {
  for (const locale of ['zh', 'en', 'th']) {
    const links = calendarSubscriptionLinks({ origin: 'https://glfans.com', locale, mode: 'all', seriesIds: ['khom-khlang'] });
    assert.equal(links.https, `https://glfans.com/api/calendar.ics?lang=${locale}`);
    assert.equal(links.webcal, `webcal://glfans.com/api/calendar.ics?lang=${locale}`);
    assert.equal(new URL(links.https).searchParams.has('series'), false);
    assert.equal(new URL(links.https).searchParams.has('month'), false);
  }
});

test('selected-show subscriptions are stable, deduplicated and sorted without mutating the supplied IDs', () => {
  const seriesIds = Object.freeze(['pls-love', 'khom-khlang', 'pls-love']);
  const links = calendarSubscriptionLinks({ origin: 'https://glfans.com', locale: 'zh', mode: 'selected', seriesIds });
  const parsed = new URL(links.https);
  assert.equal(parsed.searchParams.get('series'), 'khom-khlang,pls-love');
  assert.equal(links.webcal.replace(/^webcal:/, 'https:'), links.https);
  assert.deepEqual(seriesIds, ['pls-love', 'khom-khlang', 'pls-love']);
});

test('an empty custom selection has no actionable URL and cannot accidentally subscribe to everything', () => {
  assert.equal(calendarSubscriptionLinks({ origin: 'https://glfans.com', locale: 'en', mode: 'selected', seriesIds: [] }), null);
});

test('current CP or single-series scope takes precedence over follows and is copied into independent state', () => {
  const scope = Object.freeze(['khom-khlang']);
  const followed = Object.freeze(['pls-love']);
  const initial = initialCalendarSubscription(scope, followed, ['khom-khlang', 'pls-love']);
  assert.deepEqual(initial, { mode: 'selected', seriesIds: ['khom-khlang'] });
  initial.seriesIds.push('pls-love');
  assert.deepEqual(scope, ['khom-khlang']);
  assert.deepEqual(followed, ['pls-love']);
});

test('default selections use valid followed IDs and otherwise start at all shows', () => {
  assert.deepEqual(initialCalendarSubscription(null, ['missing', 'pls-love', 'pls-love'], ['pls-love']), { mode: 'selected', seriesIds: ['pls-love'] });
  assert.deepEqual(initialCalendarSubscription(null, [], ['pls-love']), { mode: 'all', seriesIds: [] });
  assert.deepEqual(initialCalendarSubscription(null, ['missing'], ['pls-love']), { mode: 'all', seriesIds: [] });
});

test('production links use HTTPS while loopback development preserves its working HTTP port', () => {
  assert.equal(calendarSubscriptionLinks({ origin: 'http://glfans.com', locale: 'zh', mode: 'all' }).https, 'https://glfans.com/api/calendar.ics?lang=zh');
  for (const origin of ['http://127.0.0.1:4186', 'http://localhost:4186', 'http://[::1]:4186']) {
    assert.equal(calendarSubscriptionLinks({ origin, locale: 'zh', mode: 'all' }).https, `${origin}/api/calendar.ics?lang=zh`);
  }
});

test('unsafe values and unsupported locale or protocol cannot produce a subscription URL', () => {
  const input = { origin: 'https://glfans.com', locale: 'zh', mode: 'selected', seriesIds: ['khom-khlang'] };
  for (const id of ['khom-khlang,pls-love', 'x&lang=en', '../secret', 'a\r\nLocation:evil', '']) {
    assert.throws(() => calendarSubscriptionLinks({ ...input, seriesIds: [id] }), /series ID/);
  }
  assert.throws(() => calendarSubscriptionLinks({ ...input, locale: 'fr' }), /language/);
  assert.throws(() => calendarSubscriptionLinks({ ...input, mode: 'month' }), /mode/);
  assert.throws(() => calendarSubscriptionLinks({ ...input, origin: 'file:///private/data' }), /HTTP origin/);
});

test('all subscription labels and explanations exist in Chinese, English and Thai', () => {
  const keys = Object.keys(calendarCopy.zh).filter(key => key === 'subscribe' || key.startsWith('subscription'));
  for (const locale of ['zh', 'en', 'th']) for (const key of keys) assert.ok(calendarCopy[locale][key]?.trim(), `${locale}.${key}`);
});
