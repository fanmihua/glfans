import { useLayoutEffect, useState } from "react";
import { listenToMediaQuery, observeElementResize } from "../../lib/browser-compat.js";

export function pointOnWelcomeCurve(points, t) {
  const u = 1 - t;
  const weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
  return {
    x: points.reduce((sum, point, index) => sum + point.x * weights[index], 0),
    y: points.reduce((sum, point, index) => sum + point.y * weights[index], 0),
  };
}

export function placeDesktopWelcomePortal(portal, heading, navigation) {
  // The title's rotated glyphs extend below its line box. Keep that breathing
  // room, then distribute the pit within the remaining area above navigation.
  const contentTop = heading.top + heading.height + 24;
  const available = Math.max(0, navigation.top - contentTop);
  const preferredCenter = contentTop + available * 0.45;
  const lowestCenter = navigation.top - portal.width * 0.14 - 24;
  const centerY = Math.min(preferredCenter, lowestCenter);
  return { ...portal, top: centerY - portal.height * 0.61 };
}

export function createDesktopWelcomeOrbit({ width, height }, button, portal, rightCard, labelWidth) {
  const buttonCenter = button.left + button.width / 2;
  const buttonBottom = button.top + button.height;
  const end = { x: portal.left + portal.width / 2, y: portal.top + portal.height * 0.61 };
  // Keep the bend and each full label clear of the rotated right-hand sticker.
  const rightLimit = rightCard.left - rightCard.width * 0.06 - labelWidth / 2 - 24;
  const start = {
    x: Math.min(buttonCenter, rightLimit),
    y: buttonBottom + Math.max(32, (end.y - buttonBottom) * 0.18),
  };
  const drop = end.y - start.y;
  const points = [
    start,
    { x: Math.min(start.x + width * 0.1, rightLimit), y: start.y },
    { x: Math.min(end.x + width * 0.13, rightLimit), y: end.y - drop * 0.23 },
    end,
  ];
  return {
    viewBox: `0 0 ${width} ${height}`,
    guide: `M ${buttonCenter} ${buttonBottom} L ${buttonCenter} ${start.y} L ${start.x} ${start.y}`,
    path: `M ${start.x} ${start.y} C ${points.slice(1).map((point) => `${point.x} ${point.y}`).join(", ")}`,
    points,
    stops: [0, 0.45, 0.77].map((t) => pointOnWelcomeCurve(points, t)),
  };
}

export function useDesktopWelcomeOrbit(collageRef) {
  const [orbit, setOrbit] = useState(null);
  useLayoutEffect(() => {
    const group = collageRef.current;
    const scene = group?.parentElement;
    const button = group?.querySelector(".welcome-enter-mark");
    const portal = group?.querySelector(".welcome-pit");
    const card = group?.querySelector(".welcome-card-right");
    const heading = scene?.querySelector("h2");
    const navigation = scene?.querySelector(".pit-welcome-links");
    const labels = [...(scene?.querySelectorAll(".welcome-route-stop") ?? [])];
    if (!button || !portal || !card || !heading || !navigation) return undefined;
    const mobile = window.matchMedia("(max-width: 760px)");
    const measure = (element, centered = false) => ({
      left: element.offsetLeft - (centered ? element.offsetWidth / 2 : 0),
      top: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
    const update = () => {
      const placedPortal = placeDesktopWelcomePortal(measure(portal, true), measure(heading), measure(navigation));
      setOrbit({
        ...createDesktopWelcomeOrbit(
          { width: scene.clientWidth, height: scene.clientHeight },
          measure(button, true), placedPortal, measure(card),
          Math.max(...labels.map((label) => label.offsetWidth), 90),
        ),
        pitTop: placedPortal.top,
      });
    };
    let observer;
    const syncBreakpoint = () => {
      observer?.disconnect();
      if (mobile.matches) { setOrbit(null); return; }
      update();
      observer = observeElementResize(scene, update);
      if (observer) [button, portal, card, heading, navigation, ...labels].forEach((element) => observer.observe(element));
    };
    syncBreakpoint();
    const stopListening = listenToMediaQuery(mobile, syncBreakpoint);
    return () => {
      observer?.disconnect();
      stopListening();
    };
  }, [collageRef]);
  return orbit;
}
