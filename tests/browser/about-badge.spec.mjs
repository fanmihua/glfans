import { test, expect } from '@playwright/test';
import { badgeCopy } from '../../src/features/about/badge-copy.js';

const trigger = page => page.getByRole('button', { name: badgeCopy.zh.open, exact: true });
const panel = page => page.locator('.badge-viewer-panel');
const orbit = page => page.locator('model-viewer').evaluate(viewer => ({ ...viewer.getCameraOrbit(), fov: viewer.getFieldOfView() }));
async function open(page, locale = 'zh') {
  await page.goto(`/?lang=${locale}#/about`);
  await page.getByRole('button', { name: badgeCopy[locale].open, exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
}

test('loads 3D only after activation, stays still, and can be reopened without duplicate viewers', async ({ page }) => {
  const resources = [];
  page.on('request', request => resources.push(request.url()));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?lang=zh#/about');
  await expect(trigger(page)).toBeVisible();
  expect(resources.some(url => /model-viewer[^/]*\.js|\.(?:glb|hdr)(?:[?#]|$)/.test(url))).toBe(false);
  expect(await page.evaluate(() => !!customElements.get('model-viewer'))).toBe(false);
  await trigger(page).focus();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
  const initial = await orbit(page);
  await page.waitForTimeout(350);
  const still = await orbit(page);
  expect(still.theta).toBeCloseTo(initial.theta, 4);
  expect(still.phi).toBeCloseTo(Math.PI / 2, 3);
  await page.keyboard.press('Escape');
  await expect(page.locator('model-viewer')).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  for (let i = 0; i < 2; i++) {
    await trigger(page).click();
    await expect(panel(page)).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('model-viewer')).toHaveCount(1);
    await page.getByRole('button', { name: badgeCopy.zh.close }).click();
    await expect(page.locator('model-viewer')).toHaveCount(0);
  }
  expect(resources.filter(url => /\.glb(?:[?#]|$)/.test(url)).every(url => url.startsWith('http://127.0.0.1:4174/'))).toBe(true);
  expect(resources.filter(url => /\.hdr(?:[?#]|$)/.test(url))).toEqual([
    'http://127.0.0.1:4174/assets/about/badge-studio-260a23f008e5a281.hdr',
  ]);
  expect(resources.filter(url => /draco|basis_transcoder|meshopt/.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test('drag, zoom buttons, wheel limits and reset operate on the real camera', async ({ page, browserName, isMobile }) => {
  await open(page);
  const initial = await orbit(page);
  const bounds = await page.locator('model-viewer').boundingBox();
  const x = bounds.x + bounds.width * .35, y = bounds.y + bounds.height * .4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + bounds.width * .4, y + bounds.height * .18, { steps: 20 });
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await orbit(page)).theta - initial.theta)).toBeGreaterThan(.5);
  await expect.poll(async () => Math.abs((await orbit(page)).phi - initial.phi)).toBeGreaterThan(.1);
  const dragged = await orbit(page);
  await page.getByRole('button', { name: badgeCopy.zh.zoomIn, exact: true }).click();
  await expect.poll(async () => (await orbit(page)).radius).toBeLessThan(dragged.radius);
  const closer = await orbit(page);
  await page.getByRole('button', { name: badgeCopy.zh.zoomOut, exact: true }).click();
  await expect.poll(async () => (await orbit(page)).radius).toBeGreaterThan(closer.radius);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  if (browserName === 'webkit' && isMobile) {
    await page.getByRole('button', { name: badgeCopy.zh.zoomIn, exact: true }).evaluate(button => { for (let i = 0; i < 60; i++) button.click(); });
  } else await page.mouse.wheel(0, -40000);
  await expect.poll(async () => (await orbit(page)).fov).toBeLessThan(initial.fov);
  const nearest = await orbit(page);
  expect(nearest.fov).toBeGreaterThanOrEqual(13.9);
  expect(nearest.radius).toBeGreaterThan(12);
  await page.getByRole('button', { name: badgeCopy.zh.reset }).click();
  await expect.poll(async () => (await orbit(page)).theta).toBeCloseTo(initial.theta, 3);
  await expect.poll(async () => (await orbit(page)).phi).toBeCloseTo(initial.phi, 3);
  await expect.poll(async () => (await orbit(page)).radius).toBeCloseTo(initial.radius, 3);
  await expect.poll(async () => (await orbit(page)).fov).toBeCloseTo(initial.fov, 3);
  await page.screenshot({ path: `output/badge-tests/preview-${test.info().project.name}.png` });
});

test('fits the viewport, contains keyboard focus, and restores scrolling and focus after backdrop close', async ({ page, isMobile }) => {
  await page.goto('/?lang=zh#/about');
  await expect(trigger(page)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 120));
  const before = await page.evaluate(() => ({ y: window.scrollY, bodyStyle: document.body.getAttribute('style'), rootOverflow: document.documentElement.style.overflow }));
  await trigger(page).evaluate(button => button.click());
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.body.style.position)).toBe('fixed');
  const box = await panel(page).boundingBox();
  const viewport = page.viewportSize();
  expect(box.width).toBe(isMobile ? 360 : 550);
  expect(box.height).toBe(isMobile ? 500 : 650);
  expect(box.x).toBeGreaterThanOrEqual(15);
  expect(box.y).toBeGreaterThanOrEqual(15);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 15);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
  for (const button of await page.locator('.badge-viewer-toolbar button, .badge-viewer-close').all()) {
    const rect = await button.boundingBox();
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: badgeCopy.zh.reset }).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.closest('dialog')?.id)).toBe('about-badge-viewer');
  await page.mouse.click(5, 5);
  await expect(page.locator('.badge-viewer-dialog')).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(before.y);
  expect(await page.evaluate(() => document.body.style.position)).toBe('');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe(before.rootOverflow);
});

test('failed model or lighting requests keep the poster and can be retried', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let fail = 'hdr';
  await page.route(/\.(?:glb|hdr)(?:[?#]|$)/, route => new URL(route.request().url()).pathname.endsWith(`.${fail}`)
    ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.continue());
  await page.goto('/?lang=zh#/about');
  await trigger(page).click();
  for (const nextFailure of ['glb', null]) {
    await expect(panel(page)).toHaveAttribute('data-state', 'error');
    await expect(page.locator('.badge-viewer-poster')).toBeVisible();
    expect(await page.locator('.badge-viewer-poster').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.getByRole('button', { name: badgeCopy.zh.zoomIn, exact: true })).toBeDisabled();
    fail = nextFailure;
    await page.getByRole('button', { name: badgeCopy.zh.retry }).click();
  }
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
  expect(errors).toEqual([]);
});

test('closing while loading prevents late viewers and later opening still works', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requested;
  const request = new Promise(resolve => { requested = resolve; });
  await page.route(/\.glb(?:[?#]|$)/, async route => { requested(); await gate; await route.continue(); });
  await page.goto('/?lang=zh#/about');
  await trigger(page).click();
  await request;
  await page.getByRole('button', { name: badgeCopy.zh.close }).click();
  await expect(page.locator('.badge-viewer-dialog')).toHaveCount(0);
  release();
  await page.unrouteAll({ behavior: 'wait' });
  await expect(page.locator('model-viewer')).toHaveCount(0);
  await trigger(page).click();
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('model-viewer')).toHaveCount(1);
});

test('unsupported devices show a usable picture fallback without loading 3D', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'WebGL2RenderingContext', { value: undefined, configurable: true }));
  await page.goto('/?lang=zh#/about');
  await trigger(page).click();
  await expect(panel(page)).toHaveAttribute('data-state', 'error');
  await expect(page.getByText(badgeCopy.zh.unsupported, { exact: true })).toBeVisible();
  await expect(page.locator('model-viewer')).toHaveCount(0);
  await page.getByRole('button', { name: badgeCopy.zh.close }).click();
  await expect(trigger(page)).toBeFocused();
});

test('a slow load times out gracefully and can then be retried', async ({ page }) => {
  await page.clock.install();
  let release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const request = new Promise(resolve => { requested = resolve; });
  await page.route(/\.glb(?:[?#]|$)/, async route => { requested(); await gate; await route.continue(); });
  await page.goto('/?lang=zh#/about');
  await trigger(page).click();
  await request;
  await page.clock.fastForward(31000);
  await expect(page.getByText(badgeCopy.zh.timeout, { exact: true })).toBeVisible();
  await expect(page.locator('model-viewer')).toHaveCount(0);
  release();
  await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: badgeCopy.zh.retry }).click();
  await expect(panel(page)).toHaveAttribute('data-state', 'ready');
});

test('the viewer remains usable with a WeChat browser user agent', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', {
    get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.64 NetType/WIFI Language/zh_CN',
  }));
  await open(page);
  await page.getByRole('button', { name: badgeCopy.zh.zoomIn, exact: true }).click();
  await page.getByRole('button', { name: badgeCopy.zh.close }).click();
  await expect(page.locator('.badge-viewer-dialog')).toHaveCount(0);
});

test('English and Thai labels and model announcements are localized', async ({ page }) => {
  for (const locale of ['en', 'th']) {
    await open(page, locale);
    const copy = badgeCopy[locale];
    await expect(page.getByRole('button', { name: copy.reset })).toBeVisible();
    await expect(page.locator('#badge-viewer-hint')).toHaveText(copy.hint);
    expect(await page.locator('model-viewer').evaluate(viewer => viewer.a11y.front)).toBe(copy.a11y.front);
    await page.getByRole('button', { name: copy.close }).click();
  }
});

test('Android two-finger pinch changes model zoom', async ({ page, context, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Native multi-touch is exercised through Chromium on the Android viewport.');
  await open(page);
  const before = await orbit(page);
  const box = await page.locator('model-viewer').boundingBox();
  const client = await context.newCDPSession(page);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const touches = spread => [{ x: x - spread, y, id: 1 }, { x: x + spread, y, id: 2 }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches(30) });
  for (const spread of [40, 55, 70, 90]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touches(spread) });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await orbit(page)).radius).toBeLessThan(before.radius);
});
