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
  if (signal.includes("quote_text") || signal.includes("text_invalid")) return "原话需要 2—80 个字。";
  if (signal.includes("comment_body") || signal.includes("body_invalid")) return "留言需要 2—80 个字。";
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

// Startup reads may finish after a visitor has already changed a reaction.
export function mergeReactionState(serverKeys, confirmedChanges) {
  const next = new Set(serverKeys);
  for (const [key, liked] of confirmedChanges) {
    if (liked) next.add(key); else next.delete(key);
  }
  return next;
}

export function mergeCommunityStatsRead(current, incoming, reactionVersions, readVersion) {
  const next = { ...incoming };
  for (const [key, version] of reactionVersions) {
    if (version > readVersion && current[key]) {
      next[key] = { ...(incoming[key] ?? current[key]), likes: current[key].likes };
    }
  }
  return next;
}

export function mergeCommunityCommentsRead(current, incoming, reactionVersions, readVersion) {
  const currentById = new Map(current.map((comment) => [comment.id, comment]));
  return incoming.map((comment) => (
    reactionVersions.get(getTideTargetKey("comment", comment.id)) > readVersion && currentById.has(comment.id)
      ? { ...comment, likes: currentById.get(comment.id).likes }
      : comment
  ));
}
