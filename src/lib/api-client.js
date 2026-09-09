const API_ROOT = "/api";

export const isCommunityApiEnabled = import.meta.env?.VITE_COMMUNITY_API_ENABLED !== "false";

export class CommunityApiError extends Error {
  constructor({ code = "request_failed", message = "互动服务暂时没有回应，请稍后再试。", status = 0, requestId, retryAfter }) {
    super(message);
    this.name = "CommunityApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
  }
}

let sessionState = null;
let sessionPromise = null;

async function parseResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new CommunityApiError({
      code: "response_invalid",
      message: "互动服务返回了无法读取的内容，请稍后再试。",
      status: response.status,
    });
  }
  if (!response.ok || payload?.error) {
    throw new CommunityApiError({
      code: payload?.error?.code,
      message: payload?.error?.message,
      requestId: payload?.error?.requestId,
      retryAfter: response.headers.get("retry-after"),
      status: response.status,
    });
  }
  return payload?.data;
}

async function bootstrapSession() {
  if (!isCommunityApiEnabled) {
    throw new CommunityApiError({ code: "service_unconfigured", message: "互动服务尚未配置。" });
  }
  const response = await fetch(`${API_ROOT}/session`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await parseResponse(response);
  sessionState = { user: data.user, csrfToken: data.csrfToken };
  return sessionState;
}

export async function ensureCommunitySession({ force = false } = {}) {
  if (force) {
    sessionState = null;
  }
  if (!force && sessionState) return sessionState;
  if (!sessionPromise) {
    sessionPromise = bootstrapSession().finally(() => {
      sessionPromise = null;
    });
  }
  return sessionPromise;
}

export function resetCommunityApiSession() {
  sessionState = null;
  sessionPromise = null;
}

async function request(path, {
  method = "GET",
  body,
  session = false,
  write = false,
  retrySession = true,
} = {}) {
  let currentSession = null;
  if (session || write) currentSession = await ensureCommunitySession();
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (write) headers["X-CSRF-Token"] = currentSession.csrfToken;

  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      method,
      credentials: "same-origin",
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return await parseResponse(response);
  } catch (error) {
    const sessionExpired = error instanceof CommunityApiError
      && (error.code === "csrf_invalid" || error.code === "session_required");
    if (retrySession && (session || write) && sessionExpired) {
      // A sibling request may already have replaced the exact stale session
      // used by this request. Reuse that fresh state instead of starting a
      // second bootstrap after the first refresh has just completed.
      if (!sessionState || sessionState === currentSession) {
        await ensureCommunitySession({ force: true });
      }
      return request(path, { method, body, session, write, retrySession: false });
    }
    throw error;
  }
}

export function getCommunity(path) {
  return request(path);
}

export function getAuthenticatedCommunity(path) {
  return request(path, { session: true });
}

export function writeCommunity(path, { method = "POST", body } = {}) {
  return request(path, { method, body, write: true });
}

export async function loginCommunityAdmin(email, password) {
  const data = await writeCommunity("/admin/login", { body: { email, password } });
  sessionState = { user: data.user, csrfToken: data.csrfToken };
  return { user: data.user };
}

export async function logoutCommunityAdmin() {
  const data = await writeCommunity("/admin/logout");
  sessionState = { user: data.user, csrfToken: data.csrfToken };
  return { user: data.user };
}

export async function getCommunityAdminSession() {
  const session = await ensureCommunitySession({ force: true });
  if (session.user?.kind !== "admin") return null;
  const data = await getAuthenticatedCommunity("/admin/session");
  return { user: data.user };
}
