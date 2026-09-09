import { useLayoutEffect, useState } from "react";
import { listenToMediaQuery, observeElementResize } from "../../lib/browser-compat.js";

// Both trajectories share the stickers' local coordinate system.
export function createMobileEyesOrbits(cards, { width, height }) {
  const [namtan, emi, jan, freen] = cards.map((card) => ({
    x: card.left + card.width / 2,
    y: card.top + card.height / 2,
  }));
  return {
    viewBox: `0 0 ${width} ${height}`,
    solid: `M ${freen.x} ${freen.y} C ${width * 0.02} ${freen.y}, ${width * 0.02} ${emi.y}, ${emi.x} ${emi.y} C ${width * 0.55} ${emi.y}, ${width * 0.52} ${namtan.y}, ${namtan.x} ${namtan.y}`,
    dashed: `M ${namtan.x} ${namtan.y} C ${width * 0.98} ${namtan.y}, ${width * 0.98} ${jan.y}, ${jan.x} ${jan.y} C ${width * 0.55} ${jan.y}, ${width * 0.52} ${height * 0.98}, ${freen.x} ${freen.y}`,
  };
}

export function useMobileEyesOrbits(sceneRef) {
  const [orbits, setOrbits] = useState(null);
  useLayoutEffect(() => {
    const group = sceneRef.current?.querySelector(".eyes-card-run");
    if (!group) return undefined;
    const cards = [...group.querySelectorAll(".eyes-card")];
    const media = window.matchMedia("(max-width: 760px)");
    let observer;
    const update = () => setOrbits(createMobileEyesOrbits(cards.map((card) => ({
      left: card.offsetLeft,
      top: card.offsetTop,
      width: card.offsetWidth,
      height: card.offsetHeight,
    })), { width: group.clientWidth, height: group.clientHeight }));
    const syncBreakpoint = () => {
      observer?.disconnect();
      if (!media.matches) {
        setOrbits(null);
        return;
      }
      update();
      observer = observeElementResize(group, update);
      if (observer) cards.forEach((element) => observer.observe(element));
    };
    syncBreakpoint();
    const stopListening = listenToMediaQuery(media, syncBreakpoint);
    return () => {
      observer?.disconnect();
      stopListening();
    };
  }, [sceneRef]);
  return orbits;
}
