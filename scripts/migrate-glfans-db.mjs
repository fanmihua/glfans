import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "node:url";
import { migrationDatabaseConfig, quoteIdentifier } from "./lib/glfans-db.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function migrateGlfansDatabase(env = process.env) {
  const config = migrationDatabaseConfig(env);
  const databaseName = quoteIdentifier(config.database);
  const bootstrap = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    charset: "utf8mb4",
  });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS ${databaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await bootstrap.end();
  }

  const { connectionLimit: _connectionLimit, ...connectionConfig } = config;
  const connection = await mysql.createConnection({
    ...connectionConfig,
    multipleStatements: true,
    charset: "utf8mb4",
    timezone: "Z",
  });
  try {
    await connection.query("SET time_zone = '+00:00'");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
        checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const migrationDirectory = path.join(root, "db", "migrations");
    // macOS archives can materialize AppleDouble `._*` metadata files when
    // extracted on Linux. Only numbered SQL assets are executable migrations.
    const files = (await readdir(migrationDirectory))
      .filter((name) => /^[0-9][A-Za-z0-9._-]*\.sql$/.test(name))
      .sort();
    for (const file of files) {
      const sql = await readFile(path.join(migrationDirectory, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const [rows] = await connection.execute(
        "SELECT checksum FROM schema_migrations WHERE version = ? LIMIT 1",
        [file],
      );
      if (rows[0]) {
        if (rows[0].checksum !== checksum) {
          throw new Error(`已执行的 migration 被修改：${file}`);
        }
        console.log(`migration 已存在：${file}`);
        continue;
      }
      await connection.query(sql);
      await connection.execute(
        "INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)",
        [file, checksum],
      );
      console.log(`migration 已执行：${file}`);
    }
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrateGlfansDatabase().catch((error) => {
    console.error(`数据库迁移失败：${error.message}`);
    process.exitCode = 1;
  });
}
