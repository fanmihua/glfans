import { getTideTargetKey } from "../../data/tide-words.js";

export const emptyStats = Object.freeze({ comments: 0, likes: 0, uniqueVisitors: 0, views: 0 });
export const unknownStats = Object.freeze({ comments: null, likes: null, uniqueVisitors: null, views: null });

export function getQuoteCommentsMode({ skipKnownEmpty = false, statsLoaded, commentCount }) {
  return skipKnownEmpty && statsLoaded && commentCount === 0 ? "empty" : "list";
}

const nicknameStorageKey = "glfans:community-nickname:v1";

export function readSavedNickname() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(nicknameStorageKey) || "";
  } catch {
    return "";
  }
}

export function saveNickname(nickname) {
  try {
    window.localStorage.setItem(nicknameStorageKey, nickname);
  } catch {
    // The form still works when local storage is unavailable.
  }
}

export function formatCommunityError(error) {
  const message = error?.message || "互动服务暂时没有回应，请稍后再试。";
  const signal = `${error?.code || ""} ${message}`;
  if (signal.includes("rate_limit")) return "留言有点密集，先歇十分钟再来。";
  if (signal.includes("quote_text")) return "原话需要 2—120 个字。";
  if (signal.includes("comment_body")) return "留言需要 2—400 个字。";
  if (signal.includes("nickname")) return "昵称请控制在 24 个字以内。";
  if (signal.includes("JWT") || signal.includes("session")) return "匿名身份没有接通，请刷新后再试。";
  return message;
}

export function mergeTargetStats(current, targetType, targetId, nextStats) {
  const key = getTideTargetKey(targetType, targetId);
  return {
    ...current,
    [key]: {
      ...(current[key] ?? emptyStats),
      ...nextStats,
    },
  };
}
