import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectToGlfansDatabase } from "./lib/glfans-db.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function seedGlfansDatabase(env = process.env) {
  const connection = await connectToGlfansDatabase(env, { multipleStatements: true });
  try {
    const seedDirectory = path.join(root, "db", "seeds");
    // Ignore AppleDouble `._*` metadata sidecars from macOS-built archives.
    const files = (await readdir(seedDirectory))
      .filter((name) => /^[0-9][A-Za-z0-9._-]*\.sql$/.test(name))
      .sort();
    for (const file of files) {
      await connection.query(await readFile(path.join(seedDirectory, file), "utf8"));
      console.log(`seed 已同步：${file}`);
    }
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedGlfansDatabase().catch((error) => {
    console.error(`初始数据同步失败：${error.message}`);
    process.exitCode = 1;
  });
}
