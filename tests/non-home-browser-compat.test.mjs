import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("non-home runtime code does not require Array.prototype.at", async () => {
  const files = [
    "src/features/community/frequency-curve.js",
    "src/features/column/CollectionViews.jsx",
  ];

  for (const file of files) {
    const source = await readSource(file);
    assert.doesNotMatch(source, /\.at\s*\(/, `${file} must work before Array.prototype.at was added to Safari`);
  }
});

test("responsive non-home controls use the legacy MediaQueryList listener bridge", async () => {
  const files = [
    "src/hooks/useMobileLayout.js",
    "src/i18n/LanguageSwitcher.jsx",
  ];

  for (const file of files) {
    const source = await readSource(file);
    assert.match(source, /import \{ listenToMediaQuery \} from ["'][^"']*browser-compat\.js["']/, `${file} must import the shared bridge`);
    assert.match(source, /listenToMediaQuery\(/, `${file} must subscribe through the shared bridge`);
    assert.doesNotMatch(source, /\.(?:add|remove)EventListener\(\s*["']change["']/, `${file} must not require the modern MediaQueryList API`);
  }
});

test("non-home element measurements retain an initial pass and a window resize fallback", async () => {
  const files = [
    { path: "src/ArchivePage.jsx", initialPass: /\n\s*handleResize\(\);/ },
    { path: "src/features/archive/CalendarWeek.jsx", initialPass: /\n\s*center\(\);/ },
    { path: "src/features/radio/useProjectedPlayer.js", initialPass: /\n\s*update\(\);/ },
    { path: "src/features/memes/useMemeCapture.js", initialPass: /\n\s*handleResize\(\);/ },
  ];

  for (const { path, initialPass } of files) {
    const source = await readSource(path);
    assert.match(source, /import \{ observeElementResize \} from ["'][^"']*browser-compat\.js["']/, `${path} must import the optional observer helper`);
    assert.match(source, /const observer = observeElementResize\(/, `${path} must use the optional observer helper`);
    assert.doesNotMatch(source, /new ResizeObserver\(/, `${path} must not instantiate a missing global`);
    assert.match(source, /if \(!observer\) window\.addEventListener\(["']resize["']/, `${path} must fall back to viewport resize`);
    assert.match(source, /if \(!observer\) window\.removeEventListener\(["']resize["']/, `${path} must clean up its viewport fallback`);
    assert.match(source, initialPass, `${path} must calculate its initial layout without waiting for ResizeObserver`);
  }
});
