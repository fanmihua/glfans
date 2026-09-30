import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { optimizeImage } from './lib/optimize-image.mjs';

const root = path.resolve(import.meta.dirname, '..');
const argument = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const document = argument('--doc') || 'https://my.feishu.cn/wiki/PhUpwFtESiOYaVkMlwEcsqg4nWf';
const snapshot = argument('--snapshot');
const cache = path.join(root, 'output/feishu-meme-import');
await mkdir(cache, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const existingSources = {
  '75f5f354c6bc385c4281eac456a13d009cb7aa02f775e89b5f2b3b88d0d647e0': '003',
  '0e890682021f1c0dde03d6890bdc50d394bc66f105b4cbe84c6aa1e4713eca1f': '002',
  '6758c6760d5c2a672141d5ed1f860ff49d0824f563aa405c13e5eb11c6c59159': '001',
  '4b20e528def6987ba97aadb6d72a2fc647e6d18e2d270d421285efa4fc04bb32': '004',
  '5f76d82f7e392e7690032a80de1eba7b2c838b50f8e9267ba70a470477518ed1': '005',
};
function lark(args, cwd = cache) {
  return JSON.parse(execFileSync('lark-cli', args, { cwd, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 }));
}
function data(result) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.data;
}
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
async function collectSources() {
  if (snapshot) return JSON.parse(await readFile(snapshot, 'utf8'));
  const outline = data(lark(['docs', '+fetch', '--api-version', 'v2', '--as', 'user', '--doc', document, '--scope', 'outline', '--max-depth', '3'])).document.content;
  const heading = [...outline.matchAll(/<h[1-6]\b([^>]*)>([\s\S]*?)<\/h[1-6]>/g)].find(m => m[2].includes('表情包'));
  if (!heading) throw new Error('No meme section found in source document');
  const content = data(lark(['docs', '+fetch', '--api-version', 'v2', '--as', 'user', '--doc', document, '--scope', 'section', '--start-block-id', attributes(heading[1]).id, '--detail', 'full'])).document.content;
  const sources = [];
  // 逐个下载，避免 CLI 认证缓存并发刷新；原始文件永不进入 public。
  for (const tag of content.matchAll(/<img\b[^>]+>/g)) {
    const a = attributes(tag[0]);
    const token = a.src || a.token;
    if (!token) throw new Error('Image has no source token');
    const stem = hash(token);
    let filename = (await readdir(cache)).find(name => name.startsWith(stem + '.'));
    if (!filename) {
      const saved = data(lark(['docs', '+media-download', '--as', 'user', '--token', token, '--output', stem]));
      filename = path.basename(saved.saved_path);
    }
    sources.push({ path: path.join(cache, filename), sourceKey: token });
  }
  for (const tag of content.matchAll(/<bitable\b[^>]+>/g)) {
    const a = attributes(tag[0]), base = a.token, table = a['table-id'];
    const fields = data(lark(['base', '+field-list', '--as', 'user', '--base-token', base, '--table-id', table, '--limit', '100'])).fields;
    const attachments = fields.filter(f => f.type === 'attachment');
    const titles = fields.find(f => f.type === 'text');
    if (!attachments.length) continue;
    let offset = 0;
    for (;;) {
      const projection = [...attachments, ...(titles ? [titles] : [])].flatMap(f => ['--field-id', f.id]);
      const records = data(lark(['base', '+record-list', '--as', 'user', '--base-token', base, '--table-id', table, ...projection, '--offset', String(offset), '--limit', '200', '--format', 'json']));
      for (let i = 0; i < records.data.length; i++) {
        const row = records.data[i], record = records.record_id_list[i];
        for (const field of attachments) {
          for (const file of row[records.field_id_list.indexOf(field.id)] || []) {
            const stem = hash(file.file_token), extension = path.extname(file.name) || '.png';
            const filename = `${stem}${extension}`;
            if (!(await readdir(cache)).includes(filename)) data(lark(['base', '+record-download-attachment', '--as', 'user', '--base-token', base, '--table-id', table, '--record-id', record, '--file-token', file.file_token, '--output', filename]));
            const title = titles ? row[records.field_id_list.indexOf(titles.id)] : null;
            const existingId = existingSources[hash(file.file_token)];
            sources.push({ path: path.join(cache, filename), sourceKey: file.file_token, title, existingId });
          }
        }
      }
      if (!records.has_more) break;
      if (!records.data.length) throw new Error('Pagination made no progress');
      offset += records.data.length;
    }
  }
  return sources;
}

const sources = await collectSources();
const target = path.join(root, 'src/data/meme-assets.json');
let previous;
try { previous = JSON.parse(await readFile(target, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; previous = []; }
const bySource = new Map(previous.map(item => [item.sourceFingerprint, item]));
const seen = new Set();
const imported = [];
let originalBytes = 0, optimizedBytes = 0, duplicates = 0;
for (const item of sources) {
  if (item.existingId) { duplicates++; continue; }
  const input = await readFile(item.path);
  const metadata = await sharp(input, { animated: true }).metadata();
  const normalized = await sharp(input, { animated: true }).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelHash = hash(Buffer.concat([Buffer.from(JSON.stringify({ ...normalized.info, delay: metadata.delay })), normalized.data]));
  if (seen.has(pixelHash)) { duplicates++; continue; }
  seen.add(pixelHash);
  const sourceFingerprint = hash(item.sourceKey || pixelHash);
  const prior = bySource.get(sourceFingerprint);
  const result = await optimizeImage(input, { directory: path.join(root, 'public/assets/fan-memes'), maxDimension: 1280, maxBytes: 256 * 1024 });
  const id = prior?.id || `feishu-${sourceFingerprint.slice(0, 12)}`;
  const title = item.title || prior?.title || `表情包 ${String(imported.length + 6).padStart(3, '0')}`;
  imported.push({ id, title, note: '飞书原版表情包库收录。', src: `assets/fan-memes/${result.filename}`,
    alt: `飞书表情包：${title}`, downloadName: `glfans-${title.replace(/[\\/:*?"<>|]/g, '')}.webp`,
    sourceDocument: document, sourceFingerprint, pixelHash, sha256: result.sha256,
    bytes: result.bytes, originalBytes: result.originalBytes, width: result.width, height: result.height });
  originalBytes += result.originalBytes; optimizedBytes += result.bytes;
}
if (!imported.length) throw new Error('No new meme images; refusing to overwrite existing collection');
// 来源暂时移除的条目保留，以免一次不完整读取误删既有收藏。
const all = [...imported, ...previous.filter(item => !imported.some(next => next.id === item.id))];
await writeFile(target, JSON.stringify(all, null, 2) + '\n');
await writeFile(path.join(cache, 'report.json'), JSON.stringify({ sources: sources.length, duplicates, imported: imported.length, originalBytes, optimizedBytes }, null, 2) + '\n');
console.log(`Imported ${imported.length} memes; ${duplicates} existing/duplicate images skipped; ${originalBytes} -> ${optimizedBytes} bytes`);
