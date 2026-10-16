import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApp } from "../app.js";
import { loadConfig } from "../config.js";
import { DEFAULT_CALENDAR_SUBSCRIPTION_PATH } from "../calendar-subscription.js";

function fixture() {
  return {
    version: 1, generatedAt: "2026-10-16T02:00:00Z",
    series: [
      { id: "alpha", titles: { zh: "镇灵", en: "Spirit", th: "คมคลั่ง" } },
      { id: "beta", titles: { zh: "另一部剧", en: "Another Show", th: "อีกเรื่อง" } },
      { id: "pending", titles: { zh: "待定项目", en: "Pending Show", th: "รอประกาศ" } },
    ],
    events: [
      { id: "alpha:ep:1", seriesId: "alpha", date: "2026-10-16", airsAt: "2026-10-16T23:30:00+07:00", episode: 1, sourceUrl: "https://example.com/schedule?q=a,b;c", network: "GMM 25", platforms: ["OneD"], updatedAt: "2026-10-15T10:00:00Z" },
      { id: "beta:ep:1", seriesId: "beta", date: "2026-10-17", airsAt: null, episode: 1, network: null, platforms: [], updatedAt: "2026-10-14T10:00:00Z" },
    ],
  };
}

const unfold = (value) => value.replace(/\r\n[ \t]/g, "");
const properties = (value, name) => unfold(value).split("\r\n").filter((line) => line.startsWith(`${name}:`));

async function setup(t, initial = fixture()) {
  const directory = await mkdtemp(join(tmpdir(), "glfans-calendar-test-"));
  const dataPath = join(directory, "subscription.json");
  await writeFile(dataPath, JSON.stringify(initial));
  const store = new Proxy({}, { get() { throw new Error("Calendar subscriptions must not access the database"); } });
  const server = createServer(createApp({ store, config: { calendarSubscriptionPath: dataPath } }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${server.address().port}/api/calendar.ics`;
  return { dataPath, url, get: (query = "", options) => fetch(`${url}${query}`, options) };
}

test("public GET and HEAD work without cookies, origin, CSRF or database access", async (t) => {
  const { get } = await setup(t);
  const response = await get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/calendar; charset=utf-8");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  const body = await response.text();
  assert.equal(Number(response.headers.get("content-length")), Buffer.byteLength(body));
  assert.deepEqual(properties(body, "UID"), ["UID:alpha%3Aep%3A1@glfans.com", "UID:beta%3Aep%3A1@glfans.com"]);
  assert.match(body, /DTSTART:20261016T163000Z\r\n/);
  assert.match(body, /DTSTART;VALUE=DATE:20261017\r\n/);
  assert.doesNotMatch(body, /(?:^|\r\n)(?:DTEND|DURATION|BEGIN:VALARM|ATTENDEE|ORGANIZER)[:;]/);
  assert.match(body, /REFRESH-INTERVAL;VALUE=DURATION:PT1H/);
  assert.match(body, /X-PUBLISHED-TTL:PT1H/);
  assert.equal(properties(body, "X-WR-CALNAME")[0], "X-WR-CALNAME:glfans · 全部剧集");
  assert.match(body, /SUMMARY:镇灵 · 第 1 集/);
  assert.match(body, /DTSTAMP:20261015T100000Z/);
  const head = await get("", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  for (const name of ["content-type", "content-length", "etag"]) assert.equal(head.headers.get(name), response.headers.get(name));
});

test("ETags and DTSTAMP remain stable across repeated reads and canonicalized selections", async (t) => {
  const { get } = await setup(t);
  const first = await get("?lang=zh&series=beta,alpha,beta");
  const body = await first.text();
  const etag = first.headers.get("etag");
  const repeat = await get("?series=alpha,beta&lang=zh");
  assert.equal(await repeat.text(), body);
  assert.equal(repeat.headers.get("etag"), etag);
  for (const condition of [etag, `W/${etag}`, `"unrelated", W/${etag}`, "*"]) {
    const cached = await get("?series=alpha,beta", { headers: { "if-none-match": condition } });
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), "");
    assert.equal(cached.headers.get("etag"), etag);
  }
  const head = await get("?series=alpha,beta", { method: "HEAD", headers: { "if-none-match": etag } });
  assert.equal(head.status, 304);
  assert.equal(await head.text(), "");
});

test("language and exact known-series selection preserve UIDs without silently subscribing to all", async (t) => {
  const { get } = await setup(t);
  const zh = await (await get("?lang=zh&series=alpha")).text();
  const en = await (await get("?series=alpha&lang=en")).text();
  const th = await (await get("?lang=th&series=alpha")).text();
  assert.match(en, /SUMMARY:Spirit · EP\. 1/);
  assert.match(unfold(th), /SUMMARY:คมคลั่ง · ตอนที่ 1/);
  assert.deepEqual(properties(zh, "UID"), properties(en, "UID"));
  assert.deepEqual(properties(zh, "UID"), properties(th, "UID"));
  assert.equal(properties(zh, "UID").length, 1);
  assert.equal(properties(zh, "X-WR-CALNAME")[0], "X-WR-CALNAME:glfans · 镇灵");
  assert.equal(properties(en, "X-WR-CALNAME")[0], "X-WR-CALNAME:glfans · Spirit");
  assert.equal(properties(th, "X-WR-CALNAME")[0], "X-WR-CALNAME:glfans · คมคลั่ง");
  for (const [lang, allName, selectedName] of [["zh", "全部剧集", "自选 2 部剧"], ["en", "All shows", "2 selected shows"], ["th", "ทุกเรื่อง", "เลือกไว้ 2 เรื่อง"]]) {
    const all = await (await get(`?lang=${lang}`)).text();
    const selected = await (await get(`?lang=${lang}&series=beta,alpha,beta`)).text();
    assert.equal(properties(all, "X-WR-CALNAME")[0], `X-WR-CALNAME:glfans · ${allName}`);
    assert.equal(properties(selected, "X-WR-CALNAME")[0], `X-WR-CALNAME:glfans · ${selectedName}`);
  }
  // A known, not-yet-scheduled show is valid and can receive future updates.
  const pending = await get("?series=pending");
  assert.equal(pending.status, 200);
  assert.equal(properties(await pending.text(), "UID").length, 0);
  for (const query of ["?series=", "?series=unknown", "?series=alpha,unknown", "?series=alpha,", "?series=,alpha", "?series=alpha%20", "?series=alpha&series=beta", "?series[]=alpha", "?series=alpha%0D%0ABEGIN:VCALENDAR", "?lang=", "?lang=de", "?lang=zh&lang=en", "?serie=alpha"]) {
    const response = await get(query);
    assert.equal(response.status, 400, query);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.doesNotMatch(await response.text(), /BEGIN:VCALENDAR/);
  }
});

test("a replaced release is read without restart; time corrections retain UID and change the ETag", async (t) => {
  const { get, dataPath } = await setup(t);
  const before = await get("?series=alpha");
  const original = await before.text();
  const next = fixture();
  next.events[0].date = "2026-10-18";
  next.events[0].airsAt = "2026-10-18T20:00:00+07:00";
  next.events[0].updatedAt = "2026-10-16T03:00:00Z";
  await writeFile(`${dataPath}.next`, JSON.stringify(next));
  await rename(`${dataPath}.next`, dataPath);
  const after = await get("?series=alpha", { headers: { "if-none-match": before.headers.get("etag") } });
  assert.equal(after.status, 200);
  assert.notEqual(after.headers.get("etag"), before.headers.get("etag"));
  const modified = await after.text();
  assert.deepEqual(properties(modified, "UID"), properties(original, "UID"));
  assert.match(modified, /DTSTART:20261018T130000Z/);
  assert.match(modified, /DTSTAMP:20261016T030000Z/);
});

test("bad, missing and globally empty source snapshots return 503 even with a matching cached ETag", async (t) => {
  const { get, dataPath } = await setup(t);
  const healthy = await get();
  await healthy.text();
  const broken = ["{truncated", JSON.stringify({ ...fixture(), events: [] }), JSON.stringify({ ...fixture(), version: 2 })];
  const invalidDate = fixture(); invalidDate.events[0].airsAt = "2026-02-30T10:00:00Z"; broken.push(JSON.stringify(invalidDate));
  const noTimezone = fixture(); noTimezone.events[0].airsAt = "2026-10-16T10:00:00"; broken.push(JSON.stringify(noTimezone));
  const duplicate = fixture(); duplicate.events.push(duplicate.events[0]); broken.push(JSON.stringify(duplicate));
  const missingId = fixture(); delete missingId.series[0].id; broken.push(JSON.stringify(missingId));
  const unsafeUrl = fixture(); unsafeUrl.events[0].sourceUrl = "https://example.com/\r\nBEGIN:VEVENT"; broken.push(JSON.stringify(unsafeUrl));
  for (const content of broken) {
    await writeFile(dataPath, content);
    const response = await get("", { headers: { "if-none-match": healthy.headers.get("etag") } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "300");
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.text();
    assert.doesNotMatch(body, /BEGIN:VCALENDAR|subscription\.json|SyntaxError|ENOENT|stack/);
    assert.equal(JSON.parse(body).error.code, "calendar_unavailable");
  }
  await rm(dataPath);
  const missing = await get();
  assert.equal(missing.status, 503);
  assert.doesNotMatch(await missing.text(), /ENOENT|glfans-calendar-test/);
  await writeFile(dataPath, JSON.stringify(fixture()));
  assert.equal((await get()).status, 200);
});

test("switching the static release symlink updates the same subscription without an API restart", async (t) => {
  const { get, dataPath } = await setup(t);
  await rename(dataPath, `${dataPath}.release1`);
  await symlink(`${dataPath}.release1`, dataPath);
  const first = await get("?series=alpha");
  const original = await first.text();
  const next = fixture();
  next.events[0].date = "2026-10-19";
  next.events[0].airsAt = "2026-10-19T20:00:00+07:00";
  next.events[0].updatedAt = "2026-10-16T04:00:00Z";
  await writeFile(`${dataPath}.release2`, JSON.stringify(next));
  await symlink(`${dataPath}.release2`, `${dataPath}.next`);
  await rename(`${dataPath}.next`, dataPath);
  const response = await get("?series=alpha", { headers: { "if-none-match": first.headers.get("etag") } });
  assert.equal(response.status, 200);
  const updated = await response.text();
  assert.deepEqual(properties(updated, "UID"), properties(original, "UID"));
  assert.match(updated, /DTSTART:20261019T130000Z/);
  assert.notEqual(response.headers.get("etag"), first.headers.get("etag"));
});

test("source text cannot inject ICS properties and UTF-8 folds round-trip Chinese, Thai and emoji", async (t) => {
  const data = fixture();
  const injected = `镇灵,分号;\\\r\nBEGIN:VEVENT\n${"ไทย💗".repeat(30)}`;
  data.series[0].titles.zh = injected;
  data.events[0].network = "频道\r\nATTENDEE:mailto:invalid@example.com";
  const { get } = await setup(t, data);
  const response = await get("?series=alpha");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.equal(properties(body, "BEGIN").filter((line) => line === "BEGIN:VEVENT").length, 1);
  assert.equal(properties(body, "ATTENDEE").length, 0);
  assert.ok(body.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  assert.doesNotMatch(body.replaceAll("\r\n", ""), /[\r\n]/);
  assert.match(unfold(body), /SUMMARY:镇灵\\,分号\\;/);
  assert.ok(unfold(body).includes("ไทย💗".repeat(30)));
  assert.equal(properties(body, "URL")[0], "URL:https://example.com/schedule?q=a,b;c");
});

test("production source path has an explicit local override", () => {
  const env = { GLFANS_SECURITY_SECRET: "test-configuration-secret-long-enough", GLFANS_DB_USER: "test" };
  assert.equal(loadConfig(env).calendarSubscriptionPath, DEFAULT_CALENDAR_SUBSCRIPTION_PATH);
  assert.equal(loadConfig({ ...env, GLFANS_CALENDAR_DATA_PATH: "/tmp/local-calendar.json" }).calendarSubscriptionPath, "/tmp/local-calendar.json");
});
