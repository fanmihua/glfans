import { useLayoutEffect, useState } from "react";
import { listenToMediaQuery, observeElementResize } from "../../lib/browser-compat.js";

export function createMobileWelcomeOrbit({ width, height }, button, portal) {
  const start = { x: button.left + button.width / 2, y: button.top + button.height };
  const end = { x: portal.left + portal.width / 2, y: portal.top + portal.height * 0.61 };
  const drop = end.y - start.y;
  return {
    viewBox: `0 0 ${width} ${height}`,
    path: `M ${start.x} ${start.y} C ${start.x + width * 0.16} ${start.y + drop * 0.22}, ${end.x + width * 0.12} ${end.y - drop * 0.32}, ${end.x} ${end.y}`,
  };
}

export function useMobileWelcomeOrbit(collageRef) {
  const [orbit, setOrbit] = useState(null);
  useLayoutEffect(() => {
    const group = collageRef.current;
    const button = group?.querySelector(".welcome-enter-mark");
    const portal = group?.querySelector(".welcome-pit");
    if (!button || !portal) return undefined;
    const media = window.matchMedia("(max-width: 760px)");
    // Both elements are centered with translateX(-50%). Ignore scene-entry
    // transforms so the curve does not jump while the scene fades in.
    const measure = (element) => ({
      left: element.offsetLeft - element.offsetWidth / 2,
      top: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
    const update = () => setOrbit(createMobileWelcomeOrbit(
      { width: group.clientWidth, height: group.clientHeight }, measure(button), measure(portal),
    ));
    let observer;
    const syncBreakpoint = () => {
      observer?.disconnect();
      if (!media.matches) { setOrbit(null); return; }
      update();
      observer = observeElementResize(group, update);
      if (observer) [button, portal].forEach((element) => observer.observe(element));
    };
    syncBreakpoint();
    const stopListening = listenToMediaQuery(media, syncBreakpoint);
    return () => {
      observer?.disconnect();
      stopListening();
    };
  }, [collageRef]);
  return orbit;
}
