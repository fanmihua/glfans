import { getHomePreviewScene } from "./home-journey-timing.js";

export const HOME_JOURNEY_SEEN_KEY = "glfans:home-journey-seen:v1";
const HOME_JOURNEY_SEEN_VALUE = "1";

export function hasSeenHomeJourney(windowObject) {
  try {
    const storage = windowObject?.localStorage;
    return storage ? storage.getItem(HOME_JOURNEY_SEEN_KEY) === HOME_JOURNEY_SEEN_VALUE : false;
  } catch {
    return false;
  }
}

export function markHomeJourneySeen(windowObject) {
  try {
    const storage = windowObject?.localStorage;
    if (!storage) return false;
    storage.setItem(HOME_JOURNEY_SEEN_KEY, HOME_JOURNEY_SEEN_VALUE);
    return true;
  } catch {
    return false;
  }
}

export function shouldSkipHomeJourney(search, isDevelopment, windowObject) {
  return getHomePreviewScene(search, isDevelopment) === null && hasSeenHomeJourney(windowObject);
}
