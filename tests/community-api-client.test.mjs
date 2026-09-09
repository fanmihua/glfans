import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ensureCommunitySession,
  loginCommunityAdmin,
  logoutCommunityAdmin,
  resetCommunityApiSession,
  writeCommunity,
} from "../src/lib/api-client.js";

function success(data, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function failure(code, status) {
  return new Response(JSON.stringify({ error: { code, message: code, requestId: "test-request" } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("runtime and fallback build use the self-hosted API without Supabase credentials", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const runtime = [
    read("../src/community-api.js"),
    read("../src/lib/api-client.js"),
    read("../src/AdminPage.jsx"),
    read("../package.json"),
    read("../.github/workflows/deploy-pages.yml"),
  ].join("\n");
  assert.doesNotMatch(runtime, /supabase|VITE_SUPABASE|@supabase/i);
  assert.match(runtime, /VITE_COMMUNITY_API_ENABLED: "false"/);
  assert.match(runtime, /\/api/);
});

test("concurrent callers share one session bootstrap and writes carry CSRF", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  resetCommunityApiSession();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/session") {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return success({ user: { kind: "visitor", role: "visitor" }, csrfToken: "csrf-one" }, 201);
    }
    return success({ view_count: 1, unique_visitor_count: 1 });
  };

  await Promise.all([
    ensureCommunitySession(),
    writeCommunity("/community/views", { body: { targetType: "page", targetId: "tide-words" } }),
  ]);
  assert.equal(calls.filter((call) => call.url === "/api/session").length, 1);
  const write = calls.find((call) => call.url === "/api/community/views");
  assert.equal(write.options.credentials, "same-origin");
  assert.equal(write.options.headers["X-CSRF-Token"], "csrf-one");
});

test("a stale CSRF session is bootstrapped once and the write is retried once", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  resetCommunityApiSession();
  let bootstrapCount = 0;
  let writeCount = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (url === "/api/session") {
      bootstrapCount += 1;
      return success({
        user: { kind: "visitor", role: "visitor" },
        csrfToken: `csrf-${bootstrapCount}`,
      }, bootstrapCount === 1 ? 201 : 200);
    }
    writeCount += 1;
    if (writeCount === 1) return failure("csrf_invalid", 403);
    assert.equal(options.headers["X-CSRF-Token"], "csrf-2");
    return success({ id: "comment-1", status: "published" }, 201);
  };

  const result = await writeCommunity("/community/comments", {
    body: { targetType: "page", targetId: "tide-words", body: "测试评论" },
  });
  assert.equal(result.id, "comment-1");
  assert.equal(bootstrapCount, 2);
  assert.equal(writeCount, 2);
});

test("concurrent stale writes share one forced session refresh", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  resetCommunityApiSession();
  let bootstrapCount = 0;
  let writeCount = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (url === "/api/session") {
      bootstrapCount += 1;
      if (bootstrapCount > 1) await new Promise((resolve) => setTimeout(resolve, 5));
      return success({
        user: { kind: "visitor", role: "visitor" },
        csrfToken: bootstrapCount === 1 ? "csrf-stale" : "csrf-fresh",
      }, bootstrapCount === 1 ? 201 : 200);
    }
    writeCount += 1;
    if (options.headers["X-CSRF-Token"] === "csrf-stale") return failure("csrf_invalid", 403);
    assert.equal(options.headers["X-CSRF-Token"], "csrf-fresh");
    return success({ ok: true });
  };

  await ensureCommunitySession();
  await Promise.all([
    writeCommunity("/community/views", { body: { targetType: "page", targetId: "tide-words" } }),
    writeCommunity("/community/reactions/toggle", { body: { targetType: "page", targetId: "tide-words" } }),
  ]);
  assert.equal(bootstrapCount, 2);
  assert.equal(writeCount, 4);
});

test("a late stale response reuses a refresh that already completed", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  resetCommunityApiSession();
  let bootstrapCount = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (url === "/api/session") {
      bootstrapCount += 1;
      return success({
        user: { kind: "visitor", role: "visitor" },
        csrfToken: bootstrapCount === 1 ? "csrf-stale" : "csrf-fresh",
      }, bootstrapCount === 1 ? 201 : 200);
    }
    if (options.headers["X-CSRF-Token"] === "csrf-stale") {
      if (url.endsWith("/reactions/toggle")) await new Promise((resolve) => setTimeout(resolve, 10));
      return failure("csrf_invalid", 403);
    }
    return success({ ok: true });
  };

  await ensureCommunitySession();
  await Promise.all([
    writeCommunity("/community/views", { body: { targetType: "page", targetId: "tide-words" } }),
    writeCommunity("/community/reactions/toggle", { body: { targetType: "page", targetId: "tide-words" } }),
  ]);
  assert.equal(bootstrapCount, 2);
});

test("invalid admin credentials are not retried as an expired visitor session", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  resetCommunityApiSession();
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (url === "/api/session") {
      return success({ user: { kind: "visitor", role: "visitor" }, csrfToken: "csrf-login" }, 201);
    }
    return failure("invalid_credentials", 401);
  };

  await assert.rejects(() => loginCommunityAdmin("admin@example.com", "wrong-password"), (error) => {
    assert.equal(error.code, "invalid_credentials");
    return true;
  });
  assert.deepEqual(calls, ["/api/session", "/api/admin/login"]);
});

test("a failed admin logout keeps the authenticated client session for a safe retry", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  resetCommunityApiSession();
  let bootstrapCount = 0;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/session") {
      bootstrapCount += 1;
      return success({ user: { kind: "admin", role: "admin" }, csrfToken: "csrf-admin" });
    }
    if (url === "/api/admin/logout") return failure("internal_error", 503);
    assert.equal(options.headers["X-CSRF-Token"], "csrf-admin");
    return success({ items: [] });
  };

  await ensureCommunitySession();
  await assert.rejects(() => logoutCommunityAdmin(), (error) => {
    assert.equal(error.code, "internal_error");
    return true;
  });
  await writeCommunity("/admin/quotes", { body: { status: "published" } });

  assert.equal(bootstrapCount, 1);
  assert.deepEqual(calls.map((call) => call.url), [
    "/api/session",
    "/api/admin/logout",
    "/api/admin/quotes",
  ]);
});
