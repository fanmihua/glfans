import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { calendarCopy } from '../src/features/archive/calendar-copy.js';

const require = createRequire(import.meta.url);
let CalendarSubscription, CalendarSubscriptionPanel;
before(async () => {
  // Compile the actual JSX tree using the project's existing Vite dependency.
  // Keep React external so the component and server renderer share one runtime.
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/features/archive/CalendarSubscription.jsx', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic',
    define: { 'import.meta.env.BASE_URL': '"/"' },
    plugins: [{ name: 'shared-react-runtime', setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({ path: pathToFileURL(require.resolve(args.path)).href, external: true }));
    } }],
  });
  ({ CalendarSubscription, CalendarSubscriptionPanel } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`));
});

const props = {
  copy: calendarCopy.zh, locale: 'zh',
  series: [{ id: 'khom-khlang', name: 'Khom Khlang', year: '2026' }, { id: 'pls-love', name: 'Pls Love', year: '2026' }, { id: 'remain', name: 'Remain' }],
  titleFor: id => ({ 'khom-khlang': '镇灵', 'pls-love': 'PLS Love', remain: 'Remain' })[id], imageFor: () => null, onBack: () => {},
};
function render(Component, extra = {}) {
  const previous = globalThis.window;
  globalThis.window = { location: { origin: 'https://glfans.com' } };
  try { return renderToString(createElement(Component, { ...props, ...extra })); }
  finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; }
}

test('opening the real subscription component with no preferences renders the all-show URL', () => {
  const html = render(CalendarSubscription, { scopeIds: null, followedIds: [] });
  assert.match(html, /href="webcal:\/\/glfans\.com\/api\/calendar\.ics\?lang=zh"/);
  assert.ok(html.includes(calendarCopy.zh.subscriptionAllHint));
  assert.doesNotMatch(html, /链接已复制/);
});

test('the real empty-custom panel renders disabled actions without dereferencing null copy state', () => {
  const html = render(CalendarSubscriptionPanel, { selection: { mode: 'selected', seriesIds: [] }, setSelection: () => {} });
  assert.doesNotMatch(html, /href="webcal:/);
  assert.match(html, /class="calendar-subscription-apple" disabled=""/);
  assert.match(html, /class="calendar-subscription-copy" disabled=""/);
  assert.ok(html.includes(calendarCopy.zh.subscriptionEmpty));
  assert.ok(html.includes('已选 0 部'));
});

test('the real scoped component starts with independent custom selections and a valid multi-show link', () => {
  const scopeIds = Object.freeze(['pls-love', 'khom-khlang']);
  const followedIds = Object.freeze(['remain']);
  const html = render(CalendarSubscription, { scopeIds, followedIds });
  assert.match(html, /href="webcal:\/\/glfans\.com\/api\/calendar\.ics\?lang=zh&amp;series=khom-khlang%2Cpls-love"/);
  assert.equal((html.match(/type="checkbox" checked=""/g) || []).length, 2);
  assert.ok(html.indexOf('calendar-subscription-selection') < html.indexOf('calendar-subscription-actions'));
  assert.ok(html.indexOf('<h3>2026</h3>') < html.indexOf('<h3>待定档</h3>'));
  assert.deepEqual(scopeIds, ['pls-love', 'khom-khlang']);
  assert.deepEqual(followedIds, ['remain']);
});
