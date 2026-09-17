import { SITE_NAVIGATION } from "./routes.js";

const labels = {
  archive: "档案",
  cp: "百家饭",
  column: "REPO",
  memes: "表情",
};

// Reuse the public route order and destinations; only the mobile labels differ.
export const MOBILE_NAVIGATION = SITE_NAVIGATION
  .filter((item) => labels[item.id])
  .map((item) => ({ ...item, shortLabel: labels[item.id] }));

export function hasMobileNavigation(rootRoute) {
  return rootRoute === "about" || MOBILE_NAVIGATION.some((item) => item.id === rootRoute);
}
