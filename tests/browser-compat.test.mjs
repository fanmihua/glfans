import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { listenToMediaQuery, observeElementResize } from "../src/lib/browser-compat.js";

test("media query listener uses EventTarget APIs when available", () => {
  const calls = [];
  const query = {
    addEventListener: (...args) => calls.push(["addEventListener", ...args]),
    removeEventListener: (...args) => calls.push(["removeEventListener", ...args]),
    addListener: () => assert.fail("legacy listener should not be used"),
  };
  const listener = () => {};
  const cleanup = listenToMediaQuery(query, listener);
  cleanup();
  assert.deepEqual(calls, [
    ["addEventListener", "change", listener],
    ["removeEventListener", "change", listener],
  ]);
});

test("media query listener falls back to Safari's legacy APIs", () => {
  const calls = [];
  const query = {
    addListener: (...args) => calls.push(["addListener", ...args]),
    removeListener: (...args) => calls.push(["removeListener", ...args]),
  };
  const listener = () => {};
  const cleanup = listenToMediaQuery(query, listener);
  cleanup();
  assert.deepEqual(calls, [
    ["addListener", listener],
    ["removeListener", listener],
  ]);
});

test("media query listener safely degrades when neither API exists", () => {
  assert.doesNotThrow(() => listenToMediaQuery({}, () => {})());
  assert.doesNotThrow(() => listenToMediaQuery(null, () => {})());
});

test("resize observation is optional and observes the initial target when supported", () => {
  const original = globalThis.ResizeObserver;
  const calls = [];
  class FakeResizeObserver {
    constructor(listener) { calls.push(["construct", listener]); }
    observe(target) { calls.push(["observe", target]); }
    disconnect() { calls.push(["disconnect"]); }
  }
  const target = {};
  const listener = () => {};
  try {
    delete globalThis.ResizeObserver;
    assert.equal(observeElementResize(target, listener), null);
    globalThis.ResizeObserver = FakeResizeObserver;
    const observer = observeElementResize(target, listener);
    assert.ok(observer instanceof FakeResizeObserver);
    observer.disconnect();
    assert.deepEqual(calls, [
      ["construct", listener],
      ["observe", target],
      ["disconnect"],
    ]);
  } finally {
    if (original === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = original;
  }
});

test("all home layout hooks use the shared browser compatibility helpers", async () => {
  const files = [
    "useMobileHomeOrbits.js",
    "useMobileEyesOrbits.js",
    "useMobileWelcomeOrbit.js",
    "useDesktopWelcomeOrbit.js",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../src/features/home/${file}`, import.meta.url), "utf8");
    assert.match(source, /listenToMediaQuery\(/, `${file} must use the MediaQueryList fallback`);
    assert.match(source, /observeElementResize\(/, `${file} must tolerate a missing ResizeObserver`);
    assert.doesNotMatch(source, /\.addEventListener\("change"/, `${file} must not bypass the shared fallback`);
    assert.doesNotMatch(source, /new ResizeObserver\(/, `${file} must not instantiate ResizeObserver directly`);
  }
});
