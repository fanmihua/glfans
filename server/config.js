import { AppError } from "./errors.js";

function positiveInteger(value, fallback, name) {
  const parsed = value == null || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AppError(500, "config_invalid", `${name} 必须是正整数。`);
  }
  return parsed;
}
function booleanValue(value, fallback) {
  if (value == null || value === "") return fallback;
  if (["1", "true", "yes"].includes(String(value).toLowerCase())) return true;
  if (["0", "false", "no"].includes(String(value).toLowerCase())) return false;
  throw new AppError(500, "config_invalid", "布尔环境变量只能使用 true/false。");
}

export function loadDatabaseConfig(env = process.env) {
  const database = String(env.GLFANS_DB_NAME || "glfans").trim();
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new AppError(500, "config_invalid", "GLFANS_DB_NAME 只能包含字母、数字和下划线。");
  }
  const user = String(env.GLFANS_DB_USER || "").trim();
  if (!user) throw new AppError(500, "config_invalid", "缺少 GLFANS_DB_USER。");
  return {
    host: String(env.GLFANS_DB_HOST || "127.0.0.1").trim(),
    port: positiveInteger(env.GLFANS_DB_PORT, 3306, "GLFANS_DB_PORT"),
    user,
    password: String(env.GLFANS_DB_PASSWORD || ""),
    database,
    connectionLimit: positiveInteger(env.GLFANS_DB_POOL_SIZE, 8, "GLFANS_DB_POOL_SIZE"),
  };
}

export function loadConfig(env = process.env) {
  const securitySecret = String(env.GLFANS_SECURITY_SECRET || "");
  if (securitySecret.length < 32) {
    throw new AppError(500, "config_invalid", "GLFANS_SECURITY_SECRET 至少需要 32 个字符。");
  }
  const allowedOrigins = new Set(
    String(env.GLFANS_ALLOWED_ORIGINS || "https://glfans.com,https://www.glfans.com")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  return {
    host: "127.0.0.1",
    port: positiveInteger(env.GLFANS_PORT, 3100, "GLFANS_PORT"),
    database: loadDatabaseConfig(env),
    securitySecret,
    allowedOrigins,
    sessionCookieName: "glfans_session",
    cookieSecure: booleanValue(env.GLFANS_COOKIE_SECURE, true),
    visitorSessionSeconds: positiveInteger(env.GLFANS_VISITOR_SESSION_SECONDS, 365 * 24 * 60 * 60, "GLFANS_VISITOR_SESSION_SECONDS"),
    adminSessionSeconds: positiveInteger(env.GLFANS_ADMIN_SESSION_SECONDS, 12 * 60 * 60, "GLFANS_ADMIN_SESSION_SECONDS"),
    jsonLimit: "16kb",
  };
}
