import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import mysql from "mysql2/promise";
import { createApp } from "../app.js";
import { createMysqlPool, MysqlCommunityStore } from "../mysql-store.js";
import { migrateGlfansDatabase } from "../../scripts/migrate-glfans-db.mjs";
import { commentBodyField, quoteTextField } from "../validation.js";

test("new submissions allow 80 Unicode characters while editorial updates retain old limits", () => {
  for (const field of [commentBodyField, quoteTextField]) {
    assert.equal(field("💗".repeat(80), 80), "💗".repeat(80));
    assert.throws(() => field("字".repeat(81), 80), { status: 400 });
    assert.equal(field("字".repeat(100)), "字".repeat(100));
  }
});

test("MySQL comment likes persist, deduplicate concurrent retries and obey moderation", {
  skip: !process.env.GLFANS_TEST_DB_PORT && "Set GLFANS_TEST_DB_PORT to an isolated MySQL instance",
}, async (t) => {
  const database = `glfans_comments_test_${randomUUID().replaceAll("-", "")}`;
  const dbConfig = {
    host: "127.0.0.1", port: Number(process.env.GLFANS_TEST_DB_PORT),
    user: process.env.GLFANS_TEST_DB_USER || "root",
    password: process.env.GLFANS_TEST_DB_PASSWORD || "", database, connectionLimit: 8,
  };
  await migrateGlfansDatabase({
    GLFANS_DB_HOST: dbConfig.host, GLFANS_DB_PORT: String(dbConfig.port),
    GLFANS_DB_USER: dbConfig.user, GLFANS_DB_PASSWORD: dbConfig.password, GLFANS_DB_NAME: database,
  });
  const pool = createMysqlPool(dbConfig);
  const store = new MysqlCommunityStore(pool);
  const server = createServer(createApp({ store, config: {
    securitySecret: randomUUID(), allowedOrigins: new Set(), sessionCookieName: "glfans_session",
    cookieSecure: false, visitorSessionSeconds: 3600, adminSessionSeconds: 1800,
  } }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
    const cleanup = await mysql.createConnection({ ...dbConfig, database: undefined });
    try { await cleanup.query(`DROP DATABASE \`${database}\``); } finally { await cleanup.end(); }
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const bootstrap = async () => {
    const response = await fetch(`${base}/api/session`, { method: "POST", headers: { origin: base, "content-type": "application/json" }, body: "{}" });
    const cookie = response.headers.get("set-cookie").split(";", 1)[0];
    const { data } = await response.json();
    return { cookie, "x-csrf-token": data.csrfToken, origin: base, "content-type": "application/json" };
  };
  const first = await bootstrap();
  const second = await bootstrap();
  const request = async (path, headers = first, method = "GET", body) => {
    const response = await fetch(`${base}/api${path}`, { headers, method, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, ...await response.json() };
  };
  const submit = (body) => request("/community/comments", first, "POST", { targetType: "page", targetId: "tide-words", body });
  assert.equal((await submit("字".repeat(81))).status, 400);
  assert.equal((await request("/community/quotes", first, "POST", { text: "字".repeat(81) })).status, 400);
  assert.equal((await request("/community/quotes", first, "POST", { text: "💗".repeat(80) })).status, 201);
  const submitted = await submit("💗".repeat(80));
  assert.equal(submitted.status, 201);
  const id = submitted.data.id;
  const reactionPath = `/community/comments/${id}/reaction`;
  const like = (headers, liked) => request(reactionPath, headers, "PUT", { liked });
  assert.equal((await like({ ...first, "x-csrf-token": "wrong" }, true)).status, 403);
  assert.equal((await like({ ...first, origin: "https://attacker.example" }, true)).status, 403);
  assert.equal((await like(first, "true")).status, 400);
  const retries = await Promise.all(Array.from({ length: 8 }, () => like(first, true)));
  for (const result of retries) assert.deepEqual(result.data, { liked: true, likes: 1 });
  assert.deepEqual((await like(second, true)).data, { liked: true, likes: 2 });
  assert.deepEqual((await like(first, false)).data, { liked: false, likes: 1 });
  assert.deepEqual((await like(first, false)).data, { liked: false, likes: 1 });
  assert.ok(!(await request("/community/reactions", first)).data.includes(`comment:${id}`));
  assert.ok((await request("/community/reactions", second)).data.includes(`comment:${id}`));
  // A fresh store/connection must see the saved reaction, not a process-local counter.
  const reopened = new MysqlCommunityStore(createMysqlPool(dbConfig));
  try {
    assert.equal((await reopened.listPublishedComments("page", "tide-words", 20))[0].likes, 1);
  } finally { await reopened.close(); }
  await pool.execute("UPDATE community_comments SET body = ? WHERE id = ?", ["旧".repeat(300), id]);
  assert.equal((await request("/community/comments?targetType=page&targetId=tide-words")).data[0].body.length, 300);
  await pool.execute("UPDATE community_comments SET status = 'hidden' WHERE id = ?", [id]);
  assert.equal((await like(second, true)).status, 404);
  assert.equal((await request("/community/comments?targetType=page&targetId=tide-words")).data.length, 0);
  await pool.execute("DELETE FROM community_comments WHERE id = ?", [id]);
  const [remaining] = await pool.execute("SELECT COUNT(*) AS count FROM community_comment_reactions WHERE comment_id = ?", [id]);
  assert.equal(remaining[0].count, 0);
});
