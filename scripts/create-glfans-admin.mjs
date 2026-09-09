import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeEmail, hashPassword } from "../server/security.js";
import { connectToGlfansDatabase } from "./lib/glfans-db.mjs";

export async function createGlfansAdmin(env = process.env) {
  const email = normalizeEmail(env.GLFANS_ADMIN_EMAIL);
  const password = String(env.GLFANS_ADMIN_PASSWORD || "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("请通过 GLFANS_ADMIN_EMAIL 提供有效邮箱。");
  if (!password) throw new Error("请通过 GLFANS_ADMIN_PASSWORD 提供密码；脚本不会输出或保存明文密码。");
  const passwordHash = await hashPassword(password);
  const connection = await connectToGlfansDatabase(env);
  try {
    await connection.execute(
      `INSERT INTO community_identities
         (id, kind, email, password_hash, role, is_active)
       VALUES (?, 'admin', ?, ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash), kind = 'admin', role = 'admin', is_active = 1`,
      [randomUUID(), email, passwordHash],
    );
    console.log(`管理员账号已创建或更新：${email}`);
  } finally {
    await connection.end();
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createGlfansAdmin().catch((error) => {
    console.error(`管理员初始化失败：${error.message}`);
    process.exitCode = 1;
  });
}
