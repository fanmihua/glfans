import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "../app.js";
import { hashPassword } from "../security.js";

class MemoryStore {
  constructor(adminPasswordHash) {
    this.sessions = new Map();
    this.admin = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "admin@example.com",
      password_hash: adminPasswordHash,
      role: "admin",
      is_active: 1,
    };
    this.comments = [];
    this.quotes = [{
      id: "q-01",
      text: "这次真的不一样。",
      speaker: "匿名坑底人",
      cover_path: null,
      sort_order: 10,
      status: "published",
      is_pinned: 0,
      created_at: new Date("2026-09-01T00:00:00Z"),
      updated_at: new Date("2026-09-01T00:00:00Z"),
    }];
    this.reactions = new Map();
    this.loginAttempts = [];
  }

  async ping() {}
  async consumeRateLimit() {}
  async getSession(hash) { return this.sessions.get(hash) ?? null; }
  async rotateSessionCsrf(hash, csrfHash, expiresAt) {
    const current = this.sessions.get(hash);
    if (!current) return false;
    Object.assign(current, { csrf_hash: csrfHash, expires_at: expiresAt });
    return true;
  }
  async createVisitorSession({ identityId, tokenHash, csrfHash, expiresAt }) {
    const session = { identity_id: identityId, kind: "visitor", role: "visitor", email: null, csrf_hash: csrfHash, expires_at: expiresAt };
    this.sessions.set(tokenHash, session);
    return session;
  }
  async replaceSession({ oldTokenHash, identityId, tokenHash, csrfHash, expiresAt }) {
    this.sessions.delete(oldTokenHash);
    this.sessions.set(tokenHash, {
      identity_id: identityId,
      kind: "admin",
      role: "admin",
      email: this.admin.email,
      csrf_hash: csrfHash,
      expires_at: expiresAt,
    });
  }
  async deleteSession(hash) { this.sessions.delete(hash); }
  async getAdminByEmail(email) { return email === this.admin.email ? this.admin : null; }
  async countRecentFailedLogins() { return 0; }
  async recordLoginAttempt(email, ipHash, succeeded) { this.loginAttempts.push({ email, ipHash, succeeded }); }
  async getStats() {
    return [{
      target_type: "page",
      target_id: "tide-words",
      comment_count: String(this.comments.filter((item) => item.status === "published").length),
      reaction_count: "44",
      unique_visitor_count: "49",
      view_count: "97",
    }];
  }
  async listPublishedQuotes() { return this.quotes.filter((item) => item.status === "published"); }
  async getReactionKeys(identityId) { return [...(this.reactions.get(identityId) ?? [])]; }
  async listPublishedComments(targetType, targetId, limit) {
    return this.comments.filter((item) => item.target_type === targetType && item.target_id === targetId && item.status === "published").slice(0, limit);
  }
  async recordView() { return { unique_visitor_count: "50", view_count: "98" }; }
  async toggleReaction(identityId, targetType, targetId) {
    const key = `${targetType}:${targetId}`;
    const values = this.reactions.get(identityId) ?? new Set();
    const liked = !values.has(key);
    if (liked) values.add(key); else values.delete(key);
    this.reactions.set(identityId, values);
    return { liked, reaction_count: liked ? "45" : "44" };
  }
  async submitComment(identityId, input) {
    const item = {
      id: "10000000-0000-4000-8000-000000000001",
      target_type: input.targetType,
      target_id: input.targetId,
      identity_id: identityId,
      nickname: input.nickname,
      body: input.body,
      status: "published",
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.comments.unshift(item);
    return item;
  }
  async submitQuote(identityId, input) {
    const item = { id: "q-new", ...input, speaker: input.speaker, sort_order: 0, status: "published", is_pinned: 0, submitted_by: identityId };
    this.quotes.unshift(item);
    return item;
  }
  async listAdminComments({ status }) { return status ? this.comments.filter((item) => item.status === status) : this.comments; }
  async listAdminQuotes() { return this.quotes; }
  async updateComment(id, adminId, patch) {
    const item = this.comments.find((entry) => entry.id === id);
    Object.assign(item, patch, { moderated_by: adminId });
    return item;
  }
  async deleteComment(id) { this.comments = this.comments.filter((item) => item.id !== id); }
  async createAdminQuote(input) { const item = { id: "q-admin", ...input }; this.quotes.push(item); return item; }
  async updateQuote(id, patch) { const item = this.quotes.find((entry) => entry.id === id); Object.assign(item, patch); return item; }
  async deleteQuote(id) { this.quotes = this.quotes.filter((item) => item.id !== id); }
}

function cookieValue(response) {
  return response.headers.get("set-cookie").split(";", 1)[0];
}

async function json(response) {
  return { status: response.status, body: await response.json() };
}

test("community and admin contract enforces origin, session, CSRF, and roles", async (t) => {
  const store = new MemoryStore(await hashPassword("a-secure-password-123"));
  const config = {
    securitySecret: "test-security-secret-that-is-long-enough",
    allowedOrigins: new Set(),
    sessionCookieName: "glfans_session",
    cookieSecure: false,
    visitorSessionSeconds: 3600,
    adminSessionSeconds: 1800,
    jsonLimit: "16kb",
  };
  const server = createServer(createApp({ store, config }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const health = await json(await fetch(`${base}/api/health`));
  assert.equal(health.status, 200);
  assert.equal(health.body.data.database, "connected");

  const bootstrapResponse = await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: "{}",
  });
  const visitorCookie = cookieValue(bootstrapResponse);
  const bootstrap = await json(bootstrapResponse);
  assert.equal(bootstrap.status, 201);
  assert.equal(bootstrap.body.data.user.kind, "visitor");
  assert.ok(bootstrap.body.data.csrfToken);

  const secondTab = await json(await fetch(`${base}/api/session`, {
    method: "POST",
    headers: { origin: base, cookie: visitorCookie, "content-type": "application/json" },
    body: "{}",
  }));
  assert.equal(secondTab.body.data.csrfToken, bootstrap.body.data.csrfToken);

  const rejected = await json(await fetch(`${base}/api/community/comments`, {
    method: "POST",
    headers: { origin: base, cookie: visitorCookie, "content-type": "application/json" },
    body: JSON.stringify({ targetType: "page", targetId: "tide-words", body: "一条评论" }),
  }));
  assert.equal(rejected.status, 403);
  assert.equal(rejected.body.error.code, "csrf_invalid");

  const comment = await json(await fetch(`${base}/api/community/comments`, {
    method: "POST",
    headers: {
      origin: base,
      cookie: visitorCookie,
      "content-type": "application/json",
      "x-csrf-token": bootstrap.body.data.csrfToken,
    },
    body: JSON.stringify({ targetType: "page", targetId: "tide-words", nickname: "测试", body: "一条评论" }),
  }));
  assert.equal(comment.status, 201);
  assert.equal(comment.body.data.status, "published");

  const stats = await json(await fetch(`${base}/api/community/stats`));
  assert.deepEqual(stats.body.data["page:tide-words"], { comments: 1, likes: 44, uniqueVisitors: 49, views: 97 });

  const loginResponse = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: {
      origin: base,
      cookie: visitorCookie,
      "content-type": "application/json",
      "x-csrf-token": bootstrap.body.data.csrfToken,
    },
    body: JSON.stringify({ email: "ADMIN@example.com", password: "a-secure-password-123" }),
  });
  const adminCookie = cookieValue(loginResponse);
  const login = await json(loginResponse);
  assert.equal(login.status, 200);
  assert.equal(login.body.data.user.role, "admin");

  const hidden = await json(await fetch(`${base}/api/admin/comments/${comment.body.data.id}`, {
    method: "PATCH",
    headers: {
      origin: base,
      cookie: adminCookie,
      "content-type": "application/json",
      "x-csrf-token": login.body.data.csrfToken,
    },
    body: JSON.stringify({ status: "hidden" }),
  }));
  assert.equal(hidden.status, 200);
  assert.equal(hidden.body.data.status, "hidden");

  const crossSite = await json(await fetch(`${base}/api/admin/comments/${comment.body.data.id}`, {
    method: "DELETE",
    headers: {
      origin: "https://attacker.example",
      cookie: adminCookie,
      "x-csrf-token": login.body.data.csrfToken,
    },
  }));
  assert.equal(crossSite.status, 403);
  assert.equal(crossSite.body.error.code, "origin_forbidden");
});
