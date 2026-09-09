import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { AppError } from "./errors.js";

const scrypt = promisify(scryptCallback);
const PASSWORD_SCHEME = "scrypt-v1";
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_KEY_LENGTH = 64;

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
export function digestOpaqueToken(secret, token) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export async function hashPassword(password) {
  const value = String(password ?? "");
  if (value.length < 12 || value.length > 200) {
    throw new AppError(400, "password_invalid", "密码长度必须在 12 到 200 个字符之间。");
  }
  const salt = randomBytes(16);
  const derived = await scrypt(value, salt, PASSWORD_KEY_LENGTH, SCRYPT_OPTIONS);
  return [
    PASSWORD_SCHEME,
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64url"),
    Buffer.from(derived).toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, encoded) {
  try {
    const [scheme, rawN, rawR, rawP, rawSalt, rawHash] = String(encoded ?? "").split("$");
    if (scheme !== PASSWORD_SCHEME) return false;
    const options = {
      N: Number(rawN),
      r: Number(rawR),
      p: Number(rawP),
      maxmem: 64 * 1024 * 1024,
    };
    if (options.N !== SCRYPT_OPTIONS.N || options.r !== SCRYPT_OPTIONS.r || options.p !== SCRYPT_OPTIONS.p) return false;
    const expected = Buffer.from(rawHash, "base64url");
    if (expected.length !== PASSWORD_KEY_LENGTH) return false;
    const actual = Buffer.from(await scrypt(String(password ?? ""), Buffer.from(rawSalt, "base64url"), expected.length, options));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function parseCookies(header) {
  const result = {};
  for (const part of String(header ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      // Ignore malformed cookie values instead of reflecting them into an error.
    }
  }
  return result;
}

export function serializeSessionCookie(name, value, { maxAgeSeconds, secure }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(name, { secure }) {
  return serializeSessionCookie(name, "", { maxAgeSeconds: 0, secure });
}

function normalizedOrigin(value) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function assertTrustedOrigin(req, allowedOrigins) {
  const origin = normalizedOrigin(req.get("origin"));
  if (!origin) throw new AppError(403, "origin_required", "写入请求缺少可信 Origin。");

  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw new AppError(403, "origin_forbidden", "跨站写入请求已被拒绝。");
  }

  if (allowedOrigins.size > 0) {
    if (!allowedOrigins.has(origin)) throw new AppError(403, "origin_forbidden", "Origin 不在允许列表中。");
    return;
  }

  const protocol = String(req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
  const host = String(req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
  const requestOrigin = normalizedOrigin(`${protocol}://${host}`);
  if (!requestOrigin || requestOrigin !== origin) {
    throw new AppError(403, "origin_forbidden", "Origin 与当前站点不一致。");
  }
}

export function assertCsrf(req, session, secret) {
  const token = String(req.get("x-csrf-token") ?? "");
  if (!token || token.length > 256 || !session?.csrf_hash) {
    throw new AppError(403, "csrf_invalid", "安全校验已失效，请刷新后重试。");
  }
  const actual = Buffer.from(digestOpaqueToken(secret, token), "hex");
  const expected = Buffer.from(session.csrf_hash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new AppError(403, "csrf_invalid", "安全校验已失效，请刷新后重试。");
  }
}
