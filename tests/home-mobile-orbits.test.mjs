import assert from "node:assert/strict";
import test from "node:test";
import { createMobileOrbitPaths, spreadMobileFallingOrbits, stageShiftFromTranslate } from "../src/features/home/useMobileHomeOrbits.js";

const cards = [
  { left: 220, top: 264, width: 150, height: 150 },
  { left: 24, top: 273, width: 123, height: 82 },
  { left: 240, top: 418, width: 126, height: 115 },
  { left: 24, top: 372, width: 123, height: 82 },
  { left: 63, top: 473, width: 98, height: 98 },
];
const portal = { left: -31.44, top: 489, width: 455.88, height: 341.91 };
const coordinates = (path) => path.match(/-?\d+(?:\.\d+)?/g).map(Number);

test("all five mobile CP cards connect from inside their own card to the actual portal", () => {
  const paths = createMobileOrbitPaths(cards, portal);
  assert.equal(paths.length, 5);
  assert.equal(new Set(paths).size, 5);
  paths.forEach((path, index) => {
    const values = coordinates(path);
    const card = cards[index];
    assert.equal(values.length, 8);
    assert.ok(values.every(Number.isFinite));
    assert.deepEqual(values.slice(0, 2), [card.left + card.width * 0.5, card.top + card.height * 0.78]);
    assert.deepEqual(values.slice(-2), [portal.left + portal.width * 0.5, portal.top + portal.height * 0.61]);
  });
});

test("orbit geometry follows resized containers, with no fixed desktop coordinates", () => {
  const scale = 0.82;
  const resize = (box) => Object.fromEntries(Object.entries(box).map(([key, value]) => [key, value * scale]));
  const original = createMobileOrbitPaths(cards, portal).map(coordinates);
  const resized = createMobileOrbitPaths(cards.map(resize), resize(portal)).map(coordinates);
  resized.forEach((path, index) => path.forEach((value, point) => {
    assert.ok(Math.abs(value - original[index][point] * scale) < 0.00001);
  }));
});

test("falling motion starts at the same card centers and uses the same portal destination", () => {
  const falling = createMobileOrbitPaths(cards, portal, 0.5);
  const cover = createMobileOrbitPaths(cards, portal);
  falling.forEach((path, index) => {
    const values = coordinates(path);
    assert.deepEqual(values.slice(0, 2), [cards[index].left + cards[index].width / 2, cards[index].top + cards[index].height / 2]);
    assert.deepEqual(values.slice(-2), coordinates(cover[index]).slice(-2));
  });
});

test("mobile transition expands vertical sticker spacing without moving the portal or cover", () => {
  const source = { cards, portal, height: 844, stageShift: 16.88 };
  const before = structuredClone(source);
  const result = spreadMobileFallingOrbits(source);
  assert.deepEqual(source, before);
  assert.deepEqual(result.portal, portal);
  assert.equal(result.stageShift, source.stageShift);
  assert.equal(result.cards[4].top, cards[4].top);
  assert.ok(Math.abs(Math.min(...result.cards.map((card) => card.top)) + result.stageShift - 844 * 0.14) < 0.001);
  result.cards.forEach((card, index) => {
    assert.equal(card.left, cards[index].left);
    assert.equal(card.width, cards[index].width);
    assert.equal(card.height, cards[index].height);
    assert.deepEqual(coordinates(result.centerPaths[index]).slice(0, 2), [card.left + card.width / 2, card.top + card.height / 2]);
    assert.deepEqual(coordinates(result.centerPaths[index]).slice(-2), coordinates(createMobileOrbitPaths(cards, portal)[index]).slice(-2));
  });
  assert.ok(result.cards[3].top - result.cards[1].top > cards[3].top - cards[1].top);
  assert.ok(result.cards[2].top - result.cards[0].top > cards[2].top - cards[0].top);
  assert.equal(spreadMobileFallingOrbits(null), null);
});

test("mobile stage shift does not require individual transforms or Array.prototype.at", () => {
  const originalAt = Array.prototype.at;
  try {
    Object.defineProperty(Array.prototype, "at", { value: undefined, configurable: true, writable: true });
    assert.equal(stageShiftFromTranslate("0px 16.88px"), 16.88);
    assert.equal(stageShiftFromTranslate("none"), 0);
    assert.equal(stageShiftFromTranslate(""), 0);
    assert.equal(stageShiftFromTranslate(undefined), 0);
  } finally {
    Object.defineProperty(Array.prototype, "at", { value: originalAt, configurable: true, writable: true });
  }
});
