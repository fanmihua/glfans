import assert from "node:assert/strict";
import test from "node:test";
import {
  chunkRecoveryConfig,
  installChunkRecovery,
  removeChunkRecoveryQuery,
} from "../src/app/chunk-recovery.js";

function createWindow(href = "https://glfans.com/#/archive") {
  const listeners = new Map();
  const storage = new Map();
  const replacements = [];
  const historyCalls = [];
  const windowObject = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    sessionStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); },
    },
    location: {
      href,
      replace(nextHref) {
        replacements.push(nextHref);
        this.href = nextHref;
      },
    },
    history: {
      state: { route: "archive" },
      replaceState(...args) {
        historyCalls.push(args);
        windowObject.location.href = args[2];
      },
    },
  };
  return { historyCalls, listeners, replacements, storage, windowObject };
}

test("a Vite preload failure refreshes the current route exactly once", () => {
  const fixture = createWindow();
  const uninstall = installChunkRecovery(fixture.windowObject, () => 1_000);
  let prevented = 0;

  fixture.listeners.get("vite:preloadError")({ preventDefault: () => { prevented += 1; } });

  assert.equal(prevented, 1);
  assert.equal(fixture.replacements.length, 1);
  const refreshed = new URL(fixture.replacements[0]);
  assert.equal(refreshed.hash, "#/archive");
  assert.equal(refreshed.searchParams.get(chunkRecoveryConfig.queryKey), "1000");
  assert.equal(fixture.storage.get(chunkRecoveryConfig.storageKey), "1000");

  fixture.listeners.get("vite:preloadError")({ preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 1);
  assert.equal(fixture.replacements.length, 1);

  uninstall();
  assert.equal(fixture.listeners.has("vite:preloadError"), false);
});

test("the query marker prevents a reload loop when sessionStorage is unavailable", () => {
  const fixture = createWindow(`https://glfans.com/?${chunkRecoveryConfig.queryKey}=2000#/memes`);
  fixture.windowObject.sessionStorage.getItem = () => { throw new Error("denied"); };
  fixture.windowObject.sessionStorage.setItem = () => { throw new Error("denied"); };
  installChunkRecovery(fixture.windowObject, () => 2_500);
  let prevented = false;

  fixture.listeners.get("vite:preloadError")({ preventDefault: () => { prevented = true; } });

  assert.equal(prevented, false);
  assert.deepEqual(fixture.replacements, []);
});

test("a fresh query marker takes priority over an older storage marker", () => {
  const fixture = createWindow(`https://glfans.com/?${chunkRecoveryConfig.queryKey}=90000#/about`);
  fixture.storage.set(chunkRecoveryConfig.storageKey, "1000");
  installChunkRecovery(fixture.windowObject, () => 90_500);
  let prevented = false;

  fixture.listeners.get("vite:preloadError")({ preventDefault: () => { prevented = true; } });

  assert.equal(prevented, false);
  assert.deepEqual(fixture.replacements, []);
});

test("the cache-busting query is removed after the application mounts", () => {
  const fixture = createWindow(`https://glfans.com/?lang=en&${chunkRecoveryConfig.queryKey}=3000#/radio`);

  removeChunkRecoveryQuery(fixture.windowObject);

  assert.equal(fixture.historyCalls.length, 1);
  const cleaned = new URL(fixture.windowObject.location.href);
  assert.equal(cleaned.searchParams.get("lang"), "en");
  assert.equal(cleaned.searchParams.has(chunkRecoveryConfig.queryKey), false);
  assert.equal(cleaned.hash, "#/radio");
});
