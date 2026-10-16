import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { AppError } from "./errors.js";

export const DEFAULT_CALENDAR_SUBSCRIPTION_PATH = "/var/www/glfans/current/calendar/subscription.json";
const CRLF = "\r\n";
const languages = new Set(["zh", "en", "th"]);
const seriesIdPattern = /^[a-z0-9][a-z0-9-]{0,127}$/;
const eventIdPattern = /^[a-z0-9][a-z0-9:._-]{0,255}$/;
const copy = {
  zh: { all: "全部剧集", selected: (count) => `自选 ${count} 部剧`, episode: (number) => `第 ${number} 集`, part: (number) => `第 ${number} 部分`, airing: "播出", network: "排期渠道", platforms: "相关平台", timeUnknown: "未收录播出时刻，显示为全天。" },
  en: { all: "All shows", selected: (count) => `${count} selected shows`, episode: (number) => `EP. ${number}`, part: (number) => `Part ${number}`, airing: "Airing", network: "Schedule channel", platforms: "Related platforms", timeUnknown: "Airing time is not recorded; shown as an all-day event." },
  th: { all: "ทุกเรื่อง", selected: (count) => `เลือกไว้ ${count} เรื่อง`, episode: (number) => `ตอนที่ ${number}`, part: (number) => `ส่วนที่ ${number}`, airing: "ออกอากาศ", network: "ช่องตามตาราง", platforms: "แพลตฟอร์มที่เกี่ยวข้อง", timeUnknown: "ไม่มีข้อมูลเวลาออกอากาศ จึงแสดงเป็นกิจกรรมตลอดวัน" },
};

function invalidSource() {
  throw new Error("Invalid calendar subscription source");
}

function text(value, { optional = false } = {}) {
  if (optional && (value == null || value === "")) return "";
  if (typeof value !== "string" || !value.trim() || value.length > 5000) invalidSource();
  return value;
}

function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalidSource();
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) invalidSource();
  return value;
}

function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) invalidSource();
  dateOnly(value.slice(0, 10));
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) invalidSource();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) invalidSource();
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function sourceUrl(value) {
  if (value == null || value === "") return "";
  if (typeof value !== "string" || /[\u0000-\u0020\u007f]/.test(value)) invalidSource();
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) invalidSource();
  return url.href;
}

// Validate the complete snapshot before serving any selection. A broken release
// must return 503, never an apparently successful feed that deletes saved events.
export function validateCalendarSubscriptionSource(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.series) || !data.series.length
    || !Array.isArray(data.events) || !data.events.length || data.events.length > 100_000) invalidSource();
  const generatedAt = timestamp(data.generatedAt);
  const series = new Map();
  for (const item of data.series) {
    if (!item || typeof item.id !== "string" || !seriesIdPattern.test(item.id) || series.has(item.id) || !item.titles) invalidSource();
    series.set(item.id, { id: item.id, titles: Object.fromEntries([...languages].map((lang) => [lang, text(item.titles[lang])])) });
  }
  const ids = new Set();
  const events = data.events.map((event) => {
    if (!event || typeof event.id !== "string" || !eventIdPattern.test(event.id) || ids.has(event.id) || !series.has(event.seriesId)
      || event.needsReview === true || (event.episode != null && (!Number.isSafeInteger(event.episode) || event.episode < 1))
      || ![undefined, null, "episode", "part"].includes(event.episodeUnit)) invalidSource();
    ids.add(event.id);
    const platforms = event.platforms ?? [];
    if (!Array.isArray(platforms)) invalidSource();
    return {
      id: event.id, seriesId: event.seriesId,
      date: dateOnly(event.date), airsAt: event.airsAt == null ? null : timestamp(event.airsAt),
      episode: event.episode, episodeUnit: event.episodeUnit,
      sourceUrl: sourceUrl(event.sourceUrl), network: text(event.network, { optional: true }), platforms: platforms.map((platform) => text(platform)),
      updatedAt: event.updatedAt == null ? generatedAt : timestamp(event.updatedAt),
    };
  });
  events.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { series, events, generatedAt };
}

export function parseCalendarSubscriptionQuery(rawUrl) {
  const params = new URL(rawUrl, "http://calendar.local").searchParams;
  const invalidQuery = () => { throw new AppError(400, "calendar_query_invalid", "订阅参数不正确，请重新复制订阅链接。"); };
  if ([...params.keys()].some((key) => key !== "lang" && key !== "series")
    || params.getAll("lang").length > 1 || params.getAll("series").length > 1) invalidQuery();
  const lang = params.get("lang") ?? "zh";
  if (!languages.has(lang)) invalidQuery();
  let seriesIds = null;
  if (params.has("series")) {
    const values = params.get("series").split(",");
    if (values.length > 1000 || values.some((value) => !seriesIdPattern.test(value))) invalidQuery();
    seriesIds = [...new Set(values)].sort();
  }
  return { lang, seriesIds };
}

function escapeText(value) {
  return String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function foldLine(value) {
  const lines = [];
  let line = "", bytes = 0;
  for (const character of value) {
    const length = Buffer.byteLength(character, "utf8");
    if (bytes + length > 75) { lines.push(line); line = " "; bytes = 1; }
    line += character;
    bytes += length;
  }
  return [...lines, line].join(CRLF);
}

export function createCalendarSubscription(source, { lang, seriesIds }) {
  if (seriesIds?.some((id) => !source.series.has(id))) {
    throw new AppError(400, "calendar_series_invalid", "订阅链接包含未知剧集，请重新选择剧集。");
  }
  const selected = seriesIds && new Set(seriesIds);
  const labels = copy[lang];
  const scope = !seriesIds ? labels.all : seriesIds.length === 1 ? source.series.get(seriesIds[0]).titles[lang] : labels.selected(seriesIds.length);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//glfans//Airing calendar//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeText(`glfans · ${scope}`)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const event of source.events) {
    if (selected && !selected.has(event.seriesId)) continue;
    const title = source.series.get(event.seriesId).titles[lang];
    const episode = event.episode == null ? labels.airing : (event.episodeUnit === "part" ? labels.part(event.episode) : labels.episode(event.episode));
    const description = [
      event.network && `${labels.network}: ${event.network}`,
      event.platforms.length && `${labels.platforms}: ${event.platforms.join(" / ")}`,
      !event.airsAt && labels.timeUnknown,
    ].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:${encodeURIComponent(event.id)}@glfans.com`, `DTSTAMP:${event.updatedAt}`,
      `LAST-MODIFIED:${event.updatedAt}`,
      event.airsAt ? `DTSTART:${event.airsAt}` : `DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`,
      `SUMMARY:${escapeText(`${title} · ${episode}`)}`, "TRANSP:TRANSPARENT");
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (event.sourceUrl) lines.push(`URL:${event.sourceUrl}`);
    // Start-only timed entries and date-only all-day entries preserve known
    // schedule precision; no running time or reminder is invented.
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join(CRLF)}${CRLF}`;
}

export function createCalendarSubscriptionHandler({ dataPath = DEFAULT_CALENDAR_SUBSCRIPTION_PATH } = {}) {
  return async (req, res) => {
    const query = parseCalendarSubscriptionQuery(req.originalUrl);
    let source;
    try {
      const raw = await readFile(dataPath, "utf8");
      if (Buffer.byteLength(raw, "utf8") > 20 * 1024 * 1024) invalidSource();
      source = validateCalendarSubscriptionSource(JSON.parse(raw));
    } catch {
      res.setHeader("Retry-After", "300");
      throw new AppError(503, "calendar_unavailable", "日历订阅暂时无法更新，请稍后重试。");
    }
    const calendar = createCalendarSubscription(source, query);
    const etag = `"${createHash("sha256").update(calendar).digest("hex")}"`;
    res.set({ "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate", ETag: etag });
    const candidates = (req.get("if-none-match") || "").split(",").map((value) => value.trim().replace(/^W\//, ""));
    if (candidates.includes("*") || candidates.includes(etag)) return res.status(304).end();
    res.setHeader("Content-Length", Buffer.byteLength(calendar, "utf8"));
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).end(calendar);
  };
}
