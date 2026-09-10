import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { FALLING_DURATION_MS, getHomePreviewScene } from "../src/features/home/home-journey-timing.js";
import {
  HOME_JOURNEY_SEEN_KEY,
  hasSeenHomeJourney,
  markHomeJourneySeen,
  shouldSkipHomeJourney,
} from "../src/features/home/home-journey-state.js";

function createWindowWithStorage(initialEntries = []) {
  const values = new Map(initialEntries);
  return {
    localStorage: {
      getItem(key) {
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        values.set(key, value);
      },
    },
  };
}

test("development entry opens welcome and no longer pins the transition", () => {
  assert.equal(getHomePreviewScene("?previewScene=falling", true), null);
  assert.equal(getHomePreviewScene("?previewScene=eyes", true), null);
  assert.equal(getHomePreviewScene("", true), null);
  assert.equal(getHomePreviewScene("?previewScene=welcome", true), "welcome");
});

test("production ignores inspection parameters and preserves the transition duration", () => {
  assert.equal(getHomePreviewScene("?previewScene=falling", false), null);
  assert.equal(getHomePreviewScene("?previewScene=eyes", false), null);
  assert.equal(getHomePreviewScene("?previewScene=welcome", false), null);
  assert.equal(FALLING_DURATION_MS, 1200);
});

test("new visitors see the opening and returning visitors skip straight to the first section", () => {
  const browser = createWindowWithStorage();

  assert.equal(shouldSkipHomeJourney("", false, browser), false);
  assert.equal(hasSeenHomeJourney(browser), false);
  assert.equal(markHomeJourneySeen(browser), true);
  assert.equal(hasSeenHomeJourney(browser), true);
  assert.equal(shouldSkipHomeJourney("", false, browser), true);
});

test("development preview still overrides the returning-visitor redirect", () => {
  const returningBrowser = createWindowWithStorage([[HOME_JOURNEY_SEEN_KEY, "1"]]);

  assert.equal(shouldSkipHomeJourney("?previewScene=welcome", true, returningBrowser), false);
  assert.equal(shouldSkipHomeJourney("?previewScene=falling", true, returningBrowser), true);
});

test("blocked browser storage safely falls back to the opening", () => {
  const blockedBrowser = {
    get localStorage() {
      throw new Error("storage denied");
    },
  };

  assert.equal(hasSeenHomeJourney(blockedBrowser), false);
  assert.equal(markHomeJourneySeen(blockedBrowser), false);
  assert.equal(shouldSkipHomeJourney("", false, blockedBrowser), false);
});

test("only the current seen value skips the opening", () => {
  for (const value of ["", "0", "true", "seen", "2"]) {
    const browser = createWindowWithStorage([[HOME_JOURNEY_SEEN_KEY, value]]);
    assert.equal(shouldSkipHomeJourney("", false, browser), false);
  }
  assert.equal(shouldSkipHomeJourney("", false, {}), false);
});

test("storage method failures never interrupt navigation", () => {
  const readBlockedBrowser = {
    localStorage: {
      getItem() {
        throw new Error("read denied");
      },
    },
  };
  const writeBlockedBrowser = {
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("write denied");
      },
    },
  };

  assert.equal(shouldSkipHomeJourney("", false, readBlockedBrowser), false);
  assert.equal(markHomeJourneySeen(writeBlockedBrowser), false);
});

test("mobile travel and zoom have one continuous segment, separate from fading", () => {
  const css = readFileSync(new URL("../src/home-page.css", import.meta.url), "utf8");
  for (const name of ["falling-card-pull-mobile", "falling-camera-push-mobile"]) {
    const block = css.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)^\\}`, "m"))[1];
    const offsets = [...block.matchAll(/^\s*(\d+)%\s*\{/gm)].map((match) => Number(match[1]));
    assert.deepEqual(offsets, [0, 100]);
    assert.ok(!block.includes("opacity"));
  }
  assert.match(css, /\.is-scene-falling \.falling-card\s*\{\s*--fall-card-delay: 0ms;/);
});
