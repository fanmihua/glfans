import { AppError } from "./errors.js";

const quoteIdPattern = /^q-[a-z0-9][a-z0-9-]{1,63}$/;
const commentStatuses = new Set(["pending", "published", "hidden"]);
const quoteStatuses = new Set(["draft", "published", "hidden"]);

export function objectBody(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw new AppError(400, "body_invalid", "请求内容必须是 JSON 对象。");
  }
  return req.body;
}

export function stringField(value, name, { min = 0, max, fallback, nullable = false } = {}) {
  if (value == null && fallback !== undefined) return fallback;
  if (value == null && nullable) return null;
  if (typeof value !== "string") throw new AppError(400, `${name}_invalid`, `${name} 格式不正确。`);
  const normalized = value.trim();
  const length = [...normalized].length;
  if (length < min || (max != null && length > max)) {
    throw new AppError(400, `${name}_invalid`, `${name} 长度不正确。`);
  }
  return normalized;
}

export function validateTarget(targetType, targetId) {
  const type = stringField(targetType, "targetType", { min: 1, max: 16 });
  const id = stringField(targetId, "targetId", { min: 1, max: 66 });
  if ((type === "page" && id === "tide-words") || (type === "quote" && quoteIdPattern.test(id))) {
    return { targetType: type, targetId: id };
  }
  throw new AppError(400, "community_target_invalid", "互动目标不存在或不可用。");
}

export function nicknameField(value, max = 24) {
  if (typeof value === "string" && !value.trim()) return "匿名坑底人";
  return stringField(value, "nickname", { min: 1, max, fallback: "匿名坑底人" });
}

export function commentBodyField(value) {
  return stringField(value, "body", { min: 2, max: 400 });
}

export function quoteTextField(value) {
  return stringField(value, "text", { min: 2, max: 120 });
}

export function parseLimit(value, fallback = 20, maximum = 250) {
  if (value == null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw new AppError(400, "limit_invalid", `limit 必须是 1 到 ${maximum} 的整数。`);
  }
  return number;
}

export function parseOffset(value) {
  if (value == null || value === "") return 0;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 100_000) {
    throw new AppError(400, "offset_invalid", "offset 格式不正确。");
  }
  return number;
}

export function commentStatusField(value) {
  if (!commentStatuses.has(value)) throw new AppError(400, "status_invalid", "评论状态不正确。");
  return value;
}

export function quoteStatusField(value) {
  if (!quoteStatuses.has(value)) throw new AppError(400, "status_invalid", "原话状态不正确。");
  return value;
}

export function integerField(value, name, { min = -1_000_000, max = 1_000_000 } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new AppError(400, `${name}_invalid`, `${name} 必须是整数。`);
  }
  return number;
}

export function booleanField(value, name) {
  if (typeof value !== "boolean") throw new AppError(400, `${name}_invalid`, `${name} 必须是布尔值。`);
  return value;
}
