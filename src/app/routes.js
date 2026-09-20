export const ROOT_ROUTES = ["about", "admin", "archive", "cp", "column", "memes", "radio", "tide-words"];

export const ROUTE_LOADING_COPY = {
  home: { kicker: "ENTER THE PIT", label: "正在展开入坑现场" },
  about: { kicker: "ABOUT GLFANS", label: "正在展开坑底说明" },
  admin: { kicker: "COMMUNITY DESK", label: "正在核对管理员身份" },
  archive: { kicker: "PIT ARCHIVE", label: "正在放映年度胶卷" },
  cp: { kicker: "CP ARCHIVE", label: "正在展开百家饭" },
  column: { kicker: "REPO", label: "正在整理心动证据" },
  memes: { kicker: "MEME PIT", label: "正在装填表情包" },
  radio: { kicker: "PIT FM", label: "正在接通坑底频率" },
  "tide-words": { kicker: "VOICES FROM THE PIT", label: "正在捞起坑底原话" },
};

export const SITE_NAVIGATION = [
  {
    "id": "home",
    "href": "#/",
    "label": "欢迎入坑"
  },
  {
    "id": "archive",
    "href": "#/archive",
    "label": "考古档案"
  },
  {
    "id": "cp",
    "href": "#/cp",
    "label": "百家饭"
  },
  {
    "id": "tide-words",
    "href": "#/tide-words",
    "label": "坑底文学"
  },
  {
    "id": "column",
    "href": "#/column",
    "label": "REPO 文专栏"
  },
  {
    "id": "memes",
    "href": "#/memes",
    "label": "来捡表情包"
  },
  {
    "id": "radio",
    "href": "#/radio",
    "label": "坑底电台"
  },
  {
    "id": "about",
    "href": "#/about",
    "label": "关于"
  }
];

export const welcomeLinks = SITE_NAVIGATION.filter((item) => item.id !== "home");

export function parseHashRoute(hash) {
  return hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}
