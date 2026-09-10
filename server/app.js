import express from "express";
import { randomUUID } from "node:crypto";
import { AppError } from "./errors.js";
import { createWechatSigner } from './wechat-share.js';
import {
  assertCsrf,
  assertTrustedOrigin,
  clearSessionCookie,
  createOpaqueToken,
  digestOpaqueToken,
  hashPassword,
  normalizeEmail,
  parseCookies,
  serializeSessionCookie,
  verifyPassword,
} from "./security.js";
import {
  booleanField,
  commentBodyField,
  commentStatusField,
  integerField,
  nicknameField,
  objectBody,
  parseLimit,
  parseOffset,
  quoteStatusField,
  quoteTextField,
  stringField,
  validateTarget,
} from "./validation.js";

const DUMMY_PASSWORD_HASH = await hashPassword("glfans-dummy-password-not-an-account");

function expiryDate(seconds) {
  return new Date(Date.now() + seconds * 1000);
}

function csrfForSessionToken(secret, rawToken) {
  return digestOpaqueToken(secret, `csrf:${rawToken}`);
}

function numericStats(rows) {
  return Object.fromEntries(rows.map((row) => [
    `${row.target_type}:${row.target_id}`,
    {
      comments: Number(row.comment_count ?? 0),
      likes: Number(row.reaction_count ?? 0),
      uniqueVisitors: Number(row.unique_visitor_count ?? 0),
      views: Number(row.view_count ?? 0),
    },
  ]));
}

function publicIdentity(session) {
  if (!session) return null;
  return {
    id: session.identity_id,
    kind: session.kind,
    role: session.role,
    ...(session.email ? { email: session.email } : {}),
  };
}

function responseData(res, data, status = 200) {
  res.status(status).json({ data });
}

function requestIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown").slice(0, 256);
}

function validateEmail(value) {
  const email = normalizeEmail(value);
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, "email_invalid", "邮箱格式不正确。");
  }
  return email;
}

function idField(value, kind) {
  return stringField(value, kind, { min: 2, max: 128 });
}

export function createApp({ store, config }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "same-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Cache-Control": "no-store",
    });
    next();
  });
  app.use(express.json({ limit: config.jsonLimit || "16kb", type: "application/json" }));
  const signWechat = createWechatSigner();
  app.get('/api/wechat/jssdk-signature', async (req,res) => {
    res.json(await signWechat(req.query.url));
  });

  async function loadSession(req) {
    if (req.communitySession !== undefined) return req.communitySession;
    const rawToken = parseCookies(req.get("cookie"))[config.sessionCookieName];
    if (!rawToken || rawToken.length < 32 || rawToken.length > 256) {
      req.communitySession = null;
      req.communityTokenHash = null;
      return null;
    }
    const tokenHash = digestOpaqueToken(config.securitySecret, rawToken);
    req.communityTokenHash = tokenHash;
    req.communityRawToken = rawToken;
    req.communitySession = await store.getSession(tokenHash);
    return req.communitySession;
  }

  async function requireSession(req) {
    const session = await loadSession(req);
    if (!session) throw new AppError(401, "session_required", "访客会话已失效，请刷新后重试。");
    return session;
  }

  async function requireAdmin(req) {
    const session = await requireSession(req);
    if (session.kind !== "admin" || session.role !== "admin") {
      throw new AppError(403, "admin_forbidden", "当前账号没有管理员权限。");
    }
    return session;
  }

  function guardOrigin(req) {
    assertTrustedOrigin(req, config.allowedOrigins);
  }

  async function guardIpRate(req, action, limit, windowSeconds) {
    const ipHash = digestOpaqueToken(config.securitySecret, `ip:${requestIp(req)}`);
    await store.consumeRateLimit(action, ipHash, limit, windowSeconds);
  }

  async function guardWrite(req, { admin = false } = {}) {
    guardOrigin(req);
    const session = admin ? await requireAdmin(req) : await requireSession(req);
    assertCsrf(req, session, config.securitySecret);
    return session;
  }

  async function createVisitor(res) {
    const identityId = randomUUID();
    const rawToken = createOpaqueToken();
    const csrfToken = csrfForSessionToken(config.securitySecret, rawToken);
    const tokenHash = digestOpaqueToken(config.securitySecret, rawToken);
    const csrfHash = digestOpaqueToken(config.securitySecret, csrfToken);
    const expiresAt = expiryDate(config.visitorSessionSeconds);
    const session = await store.createVisitorSession({ identityId, tokenHash, csrfHash, expiresAt });
    res.setHeader("Set-Cookie", serializeSessionCookie(config.sessionCookieName, rawToken, {
      maxAgeSeconds: config.visitorSessionSeconds,
      secure: config.cookieSecure,
    }));
    return { session, csrfToken };
  }

  app.get("/api/health", async (_req, res) => {
    try {
      await store.ping();
      responseData(res, { status: "ok", database: "connected" });
    } catch {
      responseData(res, { status: "degraded", database: "unavailable" }, 503);
    }
  });

  // CSRF bootstrap: Origin is mandatory, while a CSRF token cannot be required yet.
  // The CSRF token is stable for one session, so two tabs cannot invalidate each
  // other. Admin login still rotates the underlying session and therefore CSRF.
  app.post("/api/session", async (req, res) => {
    guardOrigin(req);
    const current = await loadSession(req);
    if (!current) {
      await guardIpRate(req, "session-create", 20, 60 * 60);
      const { session, csrfToken } = await createVisitor(res);
      responseData(res, { user: publicIdentity(session), csrfToken }, 201);
      return;
    }
    const csrfToken = csrfForSessionToken(config.securitySecret, req.communityRawToken);
    const csrfHash = digestOpaqueToken(config.securitySecret, csrfToken);
    const ttl = current.kind === "admin" ? config.adminSessionSeconds : config.visitorSessionSeconds;
    const expiresAt = expiryDate(ttl);
    const rotated = await store.rotateSessionCsrf(req.communityTokenHash, csrfHash, expiresAt);
    if (!rotated) throw new AppError(401, "session_required", "访客会话已失效，请刷新后重试。");
    current.csrf_hash = csrfHash;
    res.setHeader("Set-Cookie", serializeSessionCookie(config.sessionCookieName, req.communityRawToken, {
      maxAgeSeconds: ttl,
      secure: config.cookieSecure,
    }));
    responseData(res, { user: publicIdentity(current), csrfToken });
  });

  app.get("/api/session", async (req, res) => {
    const session = await loadSession(req);
    responseData(res, { authenticated: Boolean(session), user: publicIdentity(session) });
  });

  app.get("/api/community/stats", async (_req, res) => {
    responseData(res, numericStats(await store.getStats()));
  });

  app.get("/api/community/quotes", async (_req, res) => {
    responseData(res, await store.listPublishedQuotes());
  });

  app.get("/api/community/reactions", async (req, res) => {
    const session = await requireSession(req);
    responseData(res, await store.getReactionKeys(session.identity_id));
  });

  app.get("/api/community/comments", async (req, res) => {
    const { targetType, targetId } = validateTarget(req.query.targetType, req.query.targetId);
    const limit = parseLimit(req.query.limit, 20, 100);
    responseData(res, await store.listPublishedComments(targetType, targetId, limit));
  });

  app.post("/api/community/views", async (req, res) => {
    const session = await guardWrite(req);
    await guardIpRate(req, "community-view", 240, 10 * 60);
    const body = objectBody(req);
    const { targetType, targetId } = validateTarget(body.targetType, body.targetId);
    const result = await store.recordView(session.identity_id, targetType, targetId);
    responseData(res, {
      unique_visitor_count: Number(result.unique_visitor_count ?? 0),
      view_count: Number(result.view_count ?? 0),
    });
  });

  app.post("/api/community/reactions/toggle", async (req, res) => {
    const session = await guardWrite(req);
    await guardIpRate(req, "community-reaction", 120, 10 * 60);
    const body = objectBody(req);
    const { targetType, targetId } = validateTarget(body.targetType, body.targetId);
    const result = await store.toggleReaction(session.identity_id, targetType, targetId);
    responseData(res, { liked: Boolean(result.liked), likes: Number(result.reaction_count ?? 0) });
  });

  app.post("/api/community/comments", async (req, res) => {
    const session = await guardWrite(req);
    await guardIpRate(req, "community-comment", 10, 10 * 60);
    const body = objectBody(req);
    const { targetType, targetId } = validateTarget(body.targetType, body.targetId);
    const comment = await store.submitComment(session.identity_id, {
      targetType,
      targetId,
      nickname: nicknameField(body.nickname),
      body: commentBodyField(body.body),
    });
    responseData(res, comment, 201);
  });

  app.post("/api/community/quotes", async (req, res) => {
    const session = await guardWrite(req);
    await guardIpRate(req, "community-quote", 10, 10 * 60);
    const body = objectBody(req);
    const quote = await store.submitQuote(session.identity_id, {
      speaker: nicknameField(body.speaker),
      text: quoteTextField(body.text),
    });
    responseData(res, quote, 201);
  });

  app.post("/api/admin/login", async (req, res) => {
    await guardWrite(req);
    await guardIpRate(req, "admin-login", 20, 15 * 60);
    const body = objectBody(req);
    const email = validateEmail(body.email);
    const password = stringField(body.password, "password", { min: 1, max: 200 });
    const ipHash = digestOpaqueToken(config.securitySecret, `ip:${requestIp(req)}`);
    if (await store.countRecentFailedLogins(email, ipHash) >= 5) {
      throw new AppError(429, "login_rate_limit", "登录尝试过多，请十五分钟后再试。");
    }
    const admin = await store.getAdminByEmail(email);
    const passwordMatches = await verifyPassword(password, admin?.password_hash || DUMMY_PASSWORD_HASH);
    const valid = Boolean(admin?.is_active) && passwordMatches;
    await store.recordLoginAttempt(email, ipHash, valid);
    if (!valid) throw new AppError(401, "invalid_credentials", "邮箱或密码不正确。");

    const rawToken = createOpaqueToken();
    const csrfToken = csrfForSessionToken(config.securitySecret, rawToken);
    const tokenHash = digestOpaqueToken(config.securitySecret, rawToken);
    const csrfHash = digestOpaqueToken(config.securitySecret, csrfToken);
    await store.replaceSession({
      oldTokenHash: req.communityTokenHash,
      identityId: admin.id,
      tokenHash,
      csrfHash,
      expiresAt: expiryDate(config.adminSessionSeconds),
    });
    res.setHeader("Set-Cookie", serializeSessionCookie(config.sessionCookieName, rawToken, {
      maxAgeSeconds: config.adminSessionSeconds,
      secure: config.cookieSecure,
    }));
    responseData(res, {
      user: { id: admin.id, kind: "admin", role: admin.role, email: admin.email },
      csrfToken,
    });
  });

  app.post("/api/admin/logout", async (req, res) => {
    await guardWrite(req, { admin: true });
    await store.deleteSession(req.communityTokenHash);
    res.setHeader("Set-Cookie", clearSessionCookie(config.sessionCookieName, { secure: config.cookieSecure }));
    const { session, csrfToken } = await createVisitor(res);
    responseData(res, { user: publicIdentity(session), csrfToken });
  });

  app.get("/api/admin/session", async (req, res) => {
    const session = await requireAdmin(req);
    responseData(res, { user: publicIdentity(session) });
  });

  app.get("/api/admin/dashboard", async (req, res) => {
    await requireAdmin(req);
    const [comments, quotes, statRows] = await Promise.all([
      store.listAdminComments({ status: null, limit: 250, offset: 0 }),
      store.listAdminQuotes(),
      store.getStats(),
    ]);
    responseData(res, { comments, quotes, stats: numericStats(statRows) });
  });

  app.get("/api/admin/comments", async (req, res) => {
    await requireAdmin(req);
    const status = req.query.status && req.query.status !== "all" ? commentStatusField(req.query.status) : null;
    responseData(res, await store.listAdminComments({
      status,
      limit: parseLimit(req.query.limit, 100, 250),
      offset: parseOffset(req.query.offset),
    }));
  });

  app.patch("/api/admin/comments/:id", async (req, res) => {
    const session = await guardWrite(req, { admin: true });
    const body = objectBody(req);
    const patch = {};
    if (Object.hasOwn(body, "nickname")) patch.nickname = nicknameField(body.nickname);
    if (Object.hasOwn(body, "body")) patch.body = commentBodyField(body.body);
    if (Object.hasOwn(body, "status")) patch.status = commentStatusField(body.status);
    responseData(res, await store.updateComment(idField(req.params.id, "commentId"), session.identity_id, patch));
  });

  app.delete("/api/admin/comments/:id", async (req, res) => {
    await guardWrite(req, { admin: true });
    await store.deleteComment(idField(req.params.id, "commentId"));
    responseData(res, { deleted: true });
  });

  app.get("/api/admin/quotes", async (req, res) => {
    await requireAdmin(req);
    responseData(res, await store.listAdminQuotes());
  });

  app.post("/api/admin/quotes", async (req, res) => {
    await guardWrite(req, { admin: true });
    const body = objectBody(req);
    responseData(res, await store.createAdminQuote({
      text: quoteTextField(body.text),
      speaker: nicknameField(body.speaker, 40),
      cover_path: body.cover_path == null ? null : stringField(body.cover_path, "cover_path", { min: 1, max: 512 }),
      sort_order: body.sort_order == null ? 0 : integerField(body.sort_order, "sort_order"),
      status: body.status == null ? "draft" : quoteStatusField(body.status),
      is_pinned: body.is_pinned == null ? false : booleanField(body.is_pinned, "is_pinned"),
    }), 201);
  });

  app.patch("/api/admin/quotes/:id", async (req, res) => {
    await guardWrite(req, { admin: true });
    const body = objectBody(req);
    const patch = {};
    if (Object.hasOwn(body, "text")) patch.text = quoteTextField(body.text);
    if (Object.hasOwn(body, "speaker")) patch.speaker = nicknameField(body.speaker, 40);
    if (Object.hasOwn(body, "cover_path")) {
      patch.cover_path = body.cover_path == null ? null : stringField(body.cover_path, "cover_path", { min: 1, max: 512 });
    }
    if (Object.hasOwn(body, "sort_order")) patch.sort_order = integerField(body.sort_order, "sort_order");
    if (Object.hasOwn(body, "status")) patch.status = quoteStatusField(body.status);
    if (Object.hasOwn(body, "is_pinned")) patch.is_pinned = booleanField(body.is_pinned, "is_pinned");
    responseData(res, await store.updateQuote(idField(req.params.id, "quoteId"), patch));
  });

  app.delete("/api/admin/quotes/:id", async (req, res) => {
    await guardWrite(req, { admin: true });
    await store.deleteQuote(idField(req.params.id, "quoteId"));
    responseData(res, { deleted: true });
  });

  app.use((req, _res, next) => {
    next(new AppError(404, "not_found", `接口不存在：${req.method} ${req.path}`));
  });

  app.use((error, req, res, _next) => {
    const known = error instanceof AppError;
    const invalidJson = error instanceof SyntaxError && error.type === "entity.parse.failed";
    const status = invalidJson ? 400 : known ? error.status : 500;
    const code = invalidJson ? "json_invalid" : known ? error.code : "internal_error";
    const message = invalidJson
      ? "JSON 格式不正确。"
      : known
        ? error.message
        : "服务器暂时无法处理这个请求。";
    if (!known && !invalidJson) {
      console.error(JSON.stringify({ level: "error", requestId: req.requestId, code, message: error?.message }));
    }
    if (status === 429 && error?.details?.retryAfterSeconds) {
      res.setHeader("Retry-After", String(error.details.retryAfterSeconds));
    }
    res.status(status).json({
      error: {
        code,
        message,
        requestId: req.requestId,
        ...(known && error.details ? { details: error.details } : {}),
      },
    });
  });

  return app;
}
