// 备案准备分支的公开栏目白名单；完整功能与数据保留在 main。
export const ROOT_ROUTES = ["archive", "cp", "about"];
export const DEFAULT_ROUTE = "archive";
export const ROUTE_LOADING_COPY = {
  about: { kicker: "ABOUT GLFANS", label: "正在展开坑底说明" },
  archive: { kicker: "PIT ARCHIVE", label: "正在放映年度胶卷" },
  cp: { kicker: "CP ARCHIVE", label: "正在展开百家饭" },
};
export const SITE_NAVIGATION = [
  { id: "archive", href: "#/archive", label: "考古档案" },
  { id: "cp", href: "#/cp", label: "百家饭" },
  { id: "about", href: "#/about", label: "关于" },
];
export const welcomeLinks = SITE_NAVIGATION;
export function parseHashRoute(hash) {
  return hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}
export function isPublicRoute(route) {
  return /^(?:archive|cp|about)(?:\/[a-z0-9-]+)*\/?$/.test(route);
}
