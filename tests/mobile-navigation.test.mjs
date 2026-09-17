import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { SITE_NAVIGATION, welcomeLinks, parseHashRoute } from "../src/app/routes.js";
import { MOBILE_NAVIGATION, hasMobileNavigation } from "../src/app/mobile-navigation.js";

test("mobile tabs reuse the retained public content destinations in order", () => {
  assert.deepEqual(MOBILE_NAVIGATION.map((item) => item.shortLabel), ["档案", "百家饭", "REPO", "表情"]);
  assert.ok(MOBILE_NAVIGATION.every((item) => !("number" in item)), "mobile tabs do not carry display numbers");
  for (const tab of MOBILE_NAVIGATION) {
    assert.equal(tab.href, SITE_NAVIGATION.find((item) => item.id === tab.id).href);
    assert.equal(hasMobileNavigation(tab.id), true);
  }
});

test("desktop, shared index and mobile expose only the retained sections", () => {
  const orderedIds = ["archive", "cp", "column", "memes", "about"];
  assert.deepEqual(SITE_NAVIGATION.map((item) => item.id), orderedIds);
  assert.deepEqual(welcomeLinks.map((item) => item.id), orderedIds);
  assert.deepEqual(MOBILE_NAVIGATION.map((item) => item.id), orderedIds.slice(0, -1));
  assert.deepEqual(welcomeLinks.slice(0, 2).map((item, index) => `${String(index + 1).padStart(2, "0")} ${item.label}`), ["01 考古档案", "02 百家饭"]);
});

test("nested pages keep their parent tab; about has the bar without a false selection", () => {
  for (const hash of ["#/archive/2026", "#/archive/calendar", "#/cp/lingorm", "#/column/us/unsaid-fragments-ep01", "#/memes", "#/about/rights"]) {
    const root = parseHashRoute(hash)[0];
    assert.equal(hasMobileNavigation(root), true);
    assert.equal(MOBILE_NAVIGATION.filter((item) => item.id === root).length, root === "about" ? 0 : 1);
  }
});

test("hidden sections and unknown routes never have a mobile content bar", () => {
  for (const root of ["home", "admin", "radio", "tide-words", "unknown", undefined]) assert.equal(hasMobileNavigation(root), false);
});

test("mobile tabs use one real paper surface without stacked backing layers", () => {
  const styles = readFileSync(new URL("../src/mobile-section-nav.css", import.meta.url), "utf8");
  assert.ok(existsSync(new URL("../public/assets/mobile-nav-paper.webp", import.meta.url)));
  assert.match(styles, /\.mobile-tab-paper::before\s*\{[^}]*mobile-nav-paper\.webp/s);
  assert.doesNotMatch(styles, /box-shadow\s*:/);
  assert.match(styles, /\[aria-current="page"\] \.mobile-tab-paper::before\s*\{[^}]*filter: invert\(1\)/s);
});

test("retained mobile navigation cannot initialize or open the hidden radio player", () => {
  const source = readFileSync(new URL("../src/MobileSectionNav.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /PitRadio|usePitRadio|mobileRadioControls|#\/radio|<audio\b/);
});
