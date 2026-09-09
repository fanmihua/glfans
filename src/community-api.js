import {
  getAuthenticatedCommunity,
  getCommunity,
  getCommunityAdminSession,
  isCommunityApiEnabled,
  loginCommunityAdmin,
  logoutCommunityAdmin,
  writeCommunity,
} from "./lib/api-client.js";

// Keep the established name so the existing community UI can retain its
// configured/unconfigured fallback behavior on the static Pages backup.
export const isCommunityConfigured = isCommunityApiEnabled;

export async function loadCommunityStats() {
  if (!isCommunityConfigured) return {};
  const stats = await getCommunity("/community/stats");
  return Object.fromEntries(Object.entries(stats ?? {}).map(([key, value]) => [key, {
    comments: Number(value.comments ?? 0),
    likes: Number(value.likes ?? 0),
    uniqueVisitors: Number(value.uniqueVisitors ?? 0),
    views: Number(value.views ?? 0),
  }]));
}

export async function loadPublishedCommunityQuotes() {
  if (!isCommunityConfigured) return [];
  return await getCommunity("/community/quotes") ?? [];
}

export async function recordCommunityView(targetType, targetId) {
  return writeCommunity("/community/views", { body: { targetType, targetId } });
}

export async function toggleCommunityReaction(targetType, targetId) {
  const result = await writeCommunity("/community/reactions/toggle", { body: { targetType, targetId } });
  return { liked: Boolean(result?.liked), likes: Number(result?.likes ?? 0) };
}

export async function loadCommunityReactionState() {
  if (!isCommunityConfigured) return [];
  return await getAuthenticatedCommunity("/community/reactions") ?? [];
}

export async function loadPublishedComments(targetType, targetId, limit = 20) {
  if (!isCommunityConfigured) return [];
  const query = new URLSearchParams({ targetType, targetId, limit: String(limit) });
  return await getCommunity(`/community/comments?${query}`) ?? [];
}

export function submitCommunityComment({ targetType, targetId, nickname, body }) {
  return writeCommunity("/community/comments", {
    body: { targetType, targetId, nickname, body },
  });
}

export function submitCommunityQuote({ speaker, text }) {
  return writeCommunity("/community/quotes", { body: { speaker, text } });
}

export function loadAdminSession() {
  return getCommunityAdminSession();
}

export function loginAdmin(email, password) {
  return loginCommunityAdmin(email, password);
}

export function logoutAdmin() {
  return logoutCommunityAdmin();
}

export function loadAdminDashboard() {
  return getAuthenticatedCommunity("/admin/dashboard");
}

export function updateAdminComment(commentId, patch) {
  return writeCommunity(`/admin/comments/${encodeURIComponent(commentId)}`, {
    method: "PATCH",
    body: patch,
  });
}

export function deleteAdminComment(commentId) {
  return writeCommunity(`/admin/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

export function createAdminQuote(input) {
  return writeCommunity("/admin/quotes", { body: input });
}

export function updateAdminQuote(quoteId, patch) {
  return writeCommunity(`/admin/quotes/${encodeURIComponent(quoteId)}`, {
    method: "PATCH",
    body: patch,
  });
}

export function deleteAdminQuote(quoteId) {
  return writeCommunity(`/admin/quotes/${encodeURIComponent(quoteId)}`, { method: "DELETE" });
}
