import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { SITE_NAVIGATION, welcomeLinks, parseHashRoute } from "../src/app/routes.js";
import { MOBILE_NAVIGATION, hasMobileNavigation } from "../src/app/mobile-navigation.js";

test("mobile tabs reuse the five public content destinations in order", () => {
  assert.deepEqual(MOBILE_NAVIGATION.map((item) => item.shortLabel), ["档案", "文学", "REPO", "表情", "电台"]);
  assert.ok(MOBILE_NAVIGATION.every((item) => !("number" in item)), "mobile tabs do not carry display numbers");
  for (const tab of MOBILE_NAVIGATION) {
    assert.equal(tab.href, SITE_NAVIGATION.find((item) => item.id === tab.id).href);
    assert.equal(hasMobileNavigation(tab.id), true);
  }
});

test("desktop, welcome index and mobile share archive-before-literature order", () => {
  const orderedIds = ["home", "archive", "tide-words", "column", "memes", "radio", "about"];
  assert.deepEqual(SITE_NAVIGATION.map((item) => item.id), orderedIds);
  assert.deepEqual(welcomeLinks.map((item) => item.id), orderedIds.slice(1));
  assert.deepEqual(MOBILE_NAVIGATION.map((item) => item.id), orderedIds.slice(1, -1));
  assert.deepEqual(welcomeLinks.slice(0, 2).map((item, index) => `${String(index + 1).padStart(2, "0")} ${item.label}`), ["01 考古档案", "02 坑底文学"]);
});

test("nested pages keep their parent tab; about has the bar without a false selection", () => {
  for (const hash of ["#/column/collection/article", "#/archive/2026", "#/about/rights"]) {
    const root = parseHashRoute(hash)[0];
    assert.equal(hasMobileNavigation(root), true);
    assert.equal(MOBILE_NAVIGATION.filter((item) => item.id === root).length, root === "about" ? 0 : 1);
  }
});

test("intro and admin never have a mobile content bar", () => {
  for (const root of ["home", "admin", "unknown", undefined]) assert.equal(hasMobileNavigation(root), false);
});

test("mobile tabs use one real paper surface without stacked backing layers", () => {
  const styles = readFileSync(new URL("../src/mobile-section-nav.css", import.meta.url), "utf8");
  assert.ok(existsSync(new URL("../public/assets/mobile-nav-paper.webp", import.meta.url)));
  assert.match(styles, /\.mobile-tab-paper::before\s*\{[^}]*mobile-nav-paper\.webp/s);
  assert.doesNotMatch(styles, /box-shadow\s*:/);
  assert.match(styles, /\[aria-current="page"\] \.mobile-tab-paper::before\s*\{[^}]*filter: invert\(1\)/s);
});

test("mobile radio controls fall back before the native Popover API", () => {
  const source = readFileSync(new URL("../src/MobileSectionNav.jsx", import.meta.url), "utf8");
  const styles = readFileSync(new URL("../src/mobile-section-nav.css", import.meta.url), "utf8");
  assert.match(source, /supportsNativePopover\(\)/);
  assert.match(source, /hideNativePopoverIfOpen\(/);
  assert.doesNotMatch(source, /\.matches\(["']:popover-open/);
  assert.match(styles, /\.mobile-radio-controls\.is-fallback-open\s*\{/);
});
