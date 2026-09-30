import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// 原图留在导入目录；public 只保存压缩后的、按内容命名的图片。
export async function optimizeImage(input, { directory, maxDimension = 1600, maxBytes = 512 * 1024 } = {}) {
  const original = Buffer.isBuffer(input) ? input : await readFile(input);
  const metadata = await sharp(original, { animated: true }).metadata();
  if (!['png', 'jpeg', 'webp', 'gif', 'avif', 'tiff'].includes(metadata.format)) throw new Error('Unsupported raster image');
  const animated = (metadata.pages || 1) > 1;
  const transform = () => sharp(original, { animated: true }).rotate().resize({
    width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true,
  });
  let bytes;
  for (const quality of [86, 80, 74]) {
    bytes = await transform().webp({ quality, effort: 6, alphaQuality: 100 }).toBuffer();
    if (bytes.length <= maxBytes) break;
  }
  if (bytes.length > maxBytes) throw new Error(`Compressed image exceeds ${maxBytes} bytes; review resolution or animation before publishing`);
  const result = await sharp(bytes, { animated: true }).metadata();
  if (animated && result.pages !== metadata.pages) throw new Error('Image optimization lost animation frames');
  if (metadata.hasAlpha && !result.hasAlpha) {
    const alpha = (await sharp(original, { animated: true }).ensureAlpha().stats()).channels[3];
    if (alpha.min < 255) throw new Error('Image optimization lost transparency');
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const filename = `${sha256.slice(0, 24)}.webp`;
  if (directory) {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes);
  }
  return { filename, sha256, bytes: bytes.length, originalBytes: original.length,
    width: result.width, height: result.pageHeight || result.height, pages: result.pages || 1, animated, buffer: bytes };
}
