import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { calendarCopy } from '../src/features/archive/calendar-copy.js';
import { calendarGuideCopy } from '../src/features/archive/calendar-guide-copy.js';

const require = createRequire(import.meta.url);
let CalendarSubscription, CalendarSubscriptionPanel, CalendarGuide;
before(async () => {
  // Compile the actual JSX tree using the project's existing Vite dependency.
  // Keep React external so the component and server renderer share one runtime.
  const compile = async (file) => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(`../src/features/archive/${file}.jsx`, import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', loader: { '.css': 'empty' },
    define: { 'import.meta.env.BASE_URL': '"/"' },
    plugins: [{ name: 'shared-react-runtime', setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
    } }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  };
  ({ CalendarSubscription, CalendarSubscriptionPanel } = await compile('CalendarSubscription'));
  ({ CalendarGuide } = await compile('CalendarGuide'));
});

const props = {
  copy: calendarCopy.zh, locale: 'zh',
  series: [{ id: 'khom-khlang', name: 'Khom Khlang', year: '2026' }, { id: 'pls-love', name: 'Pls Love', year: '2026' }, { id: 'remain', name: 'Remain' }],
  titleFor: id => ({ 'khom-khlang': '镇灵', 'pls-love': 'PLS Love', remain: 'Remain' })[id], imageFor: () => null, onBack: () => {},
};
function render(Component, extra = {}, browser = {}) {
  const previous = globalThis.window;
  globalThis.window = { location: { origin: 'https://glfans.com' }, navigator: browser };
  try { return renderToString(createElement(Component, { ...props, ...extra })); }
  finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test('opening the real subscription component with no preferences renders the all-show URL', () => {
  const html = render(CalendarSubscription, { scopeIds: null, followedIds: [] });
  assert.match(html, /href="webcal:\/\/glfans\.com\/api\/calendar\.ics\?lang=zh"/);
  assert.ok(html.includes(calendarCopy.zh.subscriptionAll));
  assert.ok(!html.includes(calendarCopy.zh.subscriptionIntro));
  assert.ok(html.includes(calendarCopy.zh.subscriptionAllHint));
  assert.ok(html.includes(calendarCopy.zh.subscriptionScopeTitle));
  assert.ok(html.includes(calendarCopy.zh.subscriptionAddTitle));
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.ok(!html.includes(calendarCopy.zh.subscriptionReplace));
  assert.doesNotMatch(html, /链接已复制/);
});

test('the real empty-custom panel renders disabled actions without dereferencing null copy state', () => {
  const html = render(CalendarSubscriptionPanel, { selection: { mode: 'selected', seriesIds: [] }, setSelection: () => {} });
  assert.doesNotMatch(html, /href="webcal:/);
  assert.match(html, /class="calendar-subscription-apple" disabled=""/);
  assert.match(html, /class="calendar-subscription-copy" disabled=""/);
  assert.ok(html.includes(calendarCopy.zh.subscriptionEmpty));
  assert.ok(html.includes('已选 0 部'));
  assert.ok(html.includes(calendarCopy.zh.subscriptionReplace));
});

test('the real scoped component starts with independent custom selections and a valid multi-show link', () => {
  const scopeIds = Object.freeze(['pls-love', 'khom-khlang']);
  const followedIds = Object.freeze(['remain']);
  const html = render(CalendarSubscription, { scopeIds, followedIds });
  assert.match(html, /href="webcal:\/\/glfans\.com\/api\/calendar\.ics\?lang=zh&amp;series=khom-khlang%2Cpls-love"/);
  assert.equal((html.match(/type="checkbox" checked=""/g) || []).length, 2);
  assert.ok(html.indexOf('calendar-subscription-selection') < html.indexOf('calendar-subscription-actions'));
  assert.ok(html.indexOf('calendar-subscription-year-2026') < html.indexOf('calendar-subscription-year-undated'));
  assert.match(html, /aria-expanded="true" aria-controls="calendar-subscription-year-2026"/);
  assert.ok(html.includes(calendarCopy.zh.subscriptionSearch));
  assert.deepEqual(scopeIds, ['pls-love', 'khom-khlang']);
  assert.deepEqual(followedIds, ['remain']);
});

test('Apple embedded browsers expose one copy action and preserve the chosen shows in the webcal input', () => {
  const browsers = [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) MicroMessenger/8.0.60' },
    { userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) baiduboxapp/13.0' },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) baidubrowser/6.5', platform: 'MacIntel', maxTouchPoints: 5 },
  ];
  for (const browser of browsers) for (const locale of ['zh', 'en', 'th']) {
    for (const scopeIds of [[], ['pls-love', 'khom-khlang']]) {
      const html = render(CalendarSubscription, { copy: calendarCopy[locale], locale, scopeIds, followedIds: [] }, browser);
      const actions = html.match(/<div class="calendar-subscription-actions[^\"]*">([\s\S]*?)<\/div>/)?.[1];
      assert.equal((actions?.match(/<button /g) || []).length, 1);
      assert.doesNotMatch(actions, /<a /);
      assert.doesNotMatch(actions, / disabled=/);
      const url = `webcal://glfans.com/api/calendar.ics?lang=${locale}${scopeIds.length ? '&amp;series=khom-khlang%2Cpls-love' : ''}`;
      assert.ok(html.includes(`value="${url}"`));
      const help = html.match(/<div class="calendar-subscription-safari-note" id="calendar-subscription-help">([\s\S]*?)<\/div>/)?.[1];
      assert.match(help, /Safari/);
      assert.equal((help.match(/<li>/g) || []).length, 3);
      assert.doesNotMatch(html, /calendar-subscription-apple-help/);
    }
  }
});

test('empty custom selection in Apple embedded browsers disables the single action without an all-show fallback', () => {
  const html = render(CalendarSubscriptionPanel, { selection: { mode: 'selected', seriesIds: [] }, setSelection: () => {} }, { userAgent: 'iPhone MicroMessenger/8.0.60' });
  const actions = html.match(/<div class="calendar-subscription-actions[^\"]*">([\s\S]*?)<\/div>/)?.[1];
  assert.equal((actions?.match(/<button /g) || []).length, 1);
  assert.match(actions, /disabled=""/);
  assert.doesNotMatch(html, /(?:href|value)="(?:webcal|https):/);
});

test('Safari, desktop and Android keep the native Apple link and separate HTTPS copy action', () => {
  const browsers = [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1' },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) MicroMessenger/8.0.60', maxTouchPoints: 0 },
    { userAgent: 'Mozilla/5.0 (Linux; Android 15) MicroMessenger/8.0.60', maxTouchPoints: 5 },
  ];
  for (const browser of browsers) {
    const html = render(CalendarSubscription, { scopeIds: ['khom-khlang'], followedIds: [] }, browser);
    const actions = html.match(/<div class="calendar-subscription-actions">([\s\S]*?)<\/div>/)?.[1];
    assert.equal((actions?.match(/<button /g) || []).length, 1);
    assert.equal((actions?.match(/<a /g) || []).length, 1);
    assert.match(actions, /href="webcal:\/\/glfans\.com\/api\/calendar\.ics\?lang=zh&amp;series=khom-khlang"/);
    assert.match(html, /value="https:\/\/glfans\.com\/api\/calendar\.ics\?lang=zh&amp;series=khom-khlang"/);
    assert.doesNotMatch(html, /calendar-subscription-safari-note/);
  }
});


test('the separate guide renders localized tabs and real steps without a duplicate subscription action', () => {
  for (const locale of ['zh', 'en', 'th']) for (const mode of ['subscribe', 'import']) {
    const copy = calendarGuideCopy[locale];
    const html = renderToString(createElement(CalendarGuide, { locale, mode, onModeChange: () => {} }));
    assert.ok(html.includes(copy.title));
    assert.match(html, new RegExp(`id="calendar-guide-tab-${mode}" aria-selected="true"`));
    assert.match(html, new RegExp(`role="tabpanel" aria-labelledby="calendar-guide-tab-${mode}"`));
    assert.ok(html.includes(copy.subscribeIntro));
    assert.ok(!html.includes(copy.chooseSubscription));
    assert.ok(!html.includes(copy.toggle));
    assert.equal((html.match(/class="calendar-guide-card-text"/g) || []).length, 3);
    if (mode === 'subscribe') {
      assert.ok(html.includes(`/assets/calendar-guide/choose-${locale}.webp`));
      assert.ok(html.includes('/assets/calendar-guide/open-ios.webp'));
      assert.ok(html.includes('/assets/calendar-guide/added-ios.webp'));
      assert.ok(html.includes(copy.iphoneSteps[0]));
    } else assert.ok(html.includes(copy.downloadNote));
    assert.match(html, /<details class="calendar-guide-details calendar-guide-more">/);
    assert.doesNotMatch(html, /<details[^>]* open/);
    assert.ok(!html.includes(copy.subscribeScope));
  }
});

test('mobile keeps the three guide steps visible with detailed help collapsed', () => {
  const html = renderToString(createElement(CalendarGuide, { locale: 'zh', mode: 'subscribe', mobile: true, onModeChange: () => {} }));
  assert.equal((html.match(/class="calendar-guide-card-text"/g) || []).length, 3);
  assert.match(html, /<details class="calendar-guide-details calendar-guide-more">/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});
