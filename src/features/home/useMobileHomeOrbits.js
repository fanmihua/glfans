import { useLayoutEffect, useState } from "react";
import { listenToMediaQuery, observeElementResize } from "../../lib/browser-compat.js";

// All measurements are local to the hero, not the desktop SVG's coordinate system.
export function createMobileOrbitPaths(cards, portal, anchorY = 0.78) {
  const endX = portal.left + portal.width * 0.5;
  const endY = portal.top + portal.height * 0.61;

  return cards.map((card) => {
    const startX = card.left + card.width * 0.5;
    const startY = card.top + card.height * anchorY;
    const bendX = startX + Math.sign(startX - endX) * card.width * 0.3;
    const distanceY = endY - startY;
    return `M ${startX} ${startY} C ${bendX} ${startY + distanceY * 0.35}, ${endX + (startX - endX) * 0.4} ${endY - distanceY * 0.16}, ${endX} ${endY}`;
  });
}

// The transition has no headline, so unfold the stickers into that free space.
// Keep the lowest sticker and portal anchored; leave the cover layout untouched.
export function spreadMobileFallingOrbits(orbits) {
  if (!orbits) return null;
  const firstTop = Math.min(...orbits.cards.map((card) => card.top));
  const lastTop = Math.max(...orbits.cards.map((card) => card.top));
  const upperEdge = Math.max(48, orbits.height * 0.14) - orbits.stageShift;
  const lift = Math.max(0, firstTop - upperEdge);
  const span = Math.max(1, lastTop - firstTop);
  const cards = orbits.cards.map((card) => ({
    ...card,
    top: card.top - lift * (lastTop - card.top) / span,
  }));
  return {
    ...orbits,
    cards,
    paths: createMobileOrbitPaths(cards, orbits.portal),
    centerPaths: createMobileOrbitPaths(cards, orbits.portal, 0.5),
  };
}

export function stageShiftFromTranslate(value) {
  if (typeof value !== "string") return 0;
  const parts = value.trim().split(/\s+/);
  return Number.parseFloat(parts[parts.length - 1]) || 0;
}

export function useMobileHomeOrbits(heroRef) {
  const [orbits, setOrbits] = useState(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;

    const media = window.matchMedia("(max-width: 760px)");
    const orbit = hero.querySelector(".pit-home-cp-orbit");
    const cards = [...hero.querySelectorAll(".pit-home-cp-card")];
    const portal = hero.querySelector(".pit-home-portal");
    if (!portal || !orbit) return undefined;
    let observer;

    // offset geometry ignores the small floating animation: the line starts
    // inside the card and stays attached without chasing each animation frame.
    const measure = (element) => ({
      left: element.offsetLeft,
      top: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
    const update = () => {
      const target = measure(portal);
      const cardBoxes = cards.map((card) => ({
        ...measure(card),
        left: orbit.offsetLeft + card.offsetLeft,
        top: orbit.offsetTop + card.offsetTop,
        rotation: getComputedStyle(card).getPropertyValue("--card-rotation").trim(),
      }));
      const stageShift = stageShiftFromTranslate(getComputedStyle(orbit).translate);
      setOrbits({
        viewBox: `0 0 ${hero.clientWidth} ${hero.clientHeight}`,
        width: hero.clientWidth,
        height: hero.clientHeight,
        cards: cardBoxes,
        portal: target,
        stageShift,
        paths: createMobileOrbitPaths(cardBoxes, target),
        centerPaths: createMobileOrbitPaths(cardBoxes, target, 0.5),
        centerX: ((target.left + target.width * 0.5) / hero.clientWidth) * 100,
        centerY: ((target.top + target.height * 0.61) / hero.clientHeight) * 100,
      });
    };
    const syncBreakpoint = () => {
      observer?.disconnect();
      if (!media.matches) {
        setOrbits(null);
        return;
      }
      update();
      observer = observeElementResize(hero, update);
      if (observer) [orbit, portal, ...cards].forEach((element) => observer.observe(element));
    };

    syncBreakpoint();
    const stopListening = listenToMediaQuery(media, syncBreakpoint);
    return () => {
      observer?.disconnect();
      stopListening();
    };
  }, [heroRef]);

  return orbits;
}
