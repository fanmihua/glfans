import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadWebSnapshot, copySnapshot } from './content-manifest.mjs';

const ios = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = await loadWebSnapshot();
const generated = path.join(ios, 'Generated');
const staging = await fs.mkdtemp(path.join(ios, '.Generated-'));
try {
  await copySnapshot(snapshot, staging);
  await fs.copyFile(path.join(ios, 'Scripts/native-copy.json'), path.join(staging, 'native-copy.json'));
  // 原图保留以供 manifest 验证；PNG 同路径副本兼容现有 UIImage 本地加载。
  if (process.platform === 'darwin') {
    for (const key of Object.keys(snapshot.assets).filter(key => /\.webp$/i.test(key))) {
      const png = key.replace(/\.webp$/i, '.png');
      let reused = false;
      try {
        if ((await fs.readFile(path.join(generated, key))).equals(snapshot.assets[key])) {
          await fs.copyFile(path.join(generated, png), path.join(staging, png));
          reused = true;
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (!reused) execFileSync('/usr/bin/sips', ['-s', 'format', 'png', path.join(staging, key), '--out', path.join(staging, png)], { stdio: 'pipe' });
    }
  }
  const previous = `${generated}.previous`;
  await fs.rm(previous, { recursive: true, force: true });
  try { await fs.rename(generated, previous); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { await fs.rename(staging, generated); }
  catch (error) { try { await fs.rename(previous, generated); } catch {} throw error; }
  await fs.rm(previous, { recursive: true, force: true });
} finally {
  await fs.rm(staging, { recursive: true, force: true });
}
console.log(`iOS 同步网站版本 ${snapshot.manifest.version}：${snapshot.files.catalog.value.dramas.length} 剧集 / ${snapshot.files.catalog.value.collections.length} 合集 / ${snapshot.files.cpCatalog.value.profiles.length} 对 CP / ${Object.keys(snapshot.assets).length} 图片。`);
