import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export async function checkMediaBudget(root = 'public/assets') {
  const violations = [];
  let count = 0, bytes = 0;
  async function scan(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { await scan(file); continue; }
      if (!/\.(webp|png|jpe?g|gif|avif)$/i.test(file)) continue;
      const size = (await stat(file)).size;
      count++; bytes += size;
      if (size > 1024 * 1024) violations.push(`${file}: exceeds 1 MiB image budget`);
      if (file.includes(`${path.sep}fan-memes${path.sep}`)) {
        const meta = await sharp(file, { animated: true }).metadata();
        if (meta.format !== 'webp') violations.push(`${file}: meme must be optimized WebP`);
        if (Math.max(meta.width, meta.pageHeight || meta.height) > 1280) violations.push(`${file}: meme exceeds 1280 px`);
        if ((meta.pages || 1) === 1 && size > 256 * 1024) violations.push(`${file}: static meme exceeds 256 KiB`);
      }
    }
  }
  await scan(root);
  if (violations.length) throw new Error(violations.join('\n'));
  return { count, bytes };
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const result = await checkMediaBudget();
  console.log(`Media budget passed: ${result.count} images, ${(result.bytes / 1024 / 1024).toFixed(2)} MiB`);
}
