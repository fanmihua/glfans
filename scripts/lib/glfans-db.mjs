import mysql from "mysql2/promise";
import { loadDatabaseConfig } from "../../server/config.js";

export function migrationDatabaseConfig(env = process.env) {
  const config = loadDatabaseConfig(env);
  return {
    ...config,
    user: String(env.GLFANS_MIGRATION_DB_USER || config.user),
    password: String(env.GLFANS_MIGRATION_DB_PASSWORD ?? config.password),
  };
}

export async function connectToGlfansDatabase(env = process.env, options = {}) {
  const config = migrationDatabaseConfig(env);
  const { connectionLimit: _connectionLimit, ...connectionConfig } = config;
  const connection = await mysql.createConnection({
    ...connectionConfig,
    multipleStatements: Boolean(options.multipleStatements),
    charset: "utf8mb4",
    timezone: "Z",
    bigNumberStrings: true,
  });
  await connection.query("SET time_zone = '+00:00'");
  return connection;
}

export function quoteIdentifier(identifier) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error("数据库标识符格式不正确。");
  return `\`${identifier}\``;
}

export function isDirectRun(metaUrl) {
  return process.argv[1] && new URL(metaUrl).pathname === process.argv[1];
}
