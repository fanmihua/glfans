export function listenToMediaQuery(query, listener) {
  if (!query || typeof listener !== "function") return () => {};

  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", listener);
    return () => {
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", listener);
      }
    };
  }

  if (typeof query.addListener === "function") {
    query.addListener(listener);
    return () => {
      if (typeof query.removeListener === "function") query.removeListener(listener);
    };
  }

  return () => {};
}

export function observeElementResize(target, listener) {
  if (!target || typeof listener !== "function" || typeof ResizeObserver !== "function") return null;
  const observer = new ResizeObserver(listener);
  observer.observe(target);
  return observer;
}
