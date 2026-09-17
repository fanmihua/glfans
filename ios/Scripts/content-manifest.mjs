import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const FILE_NAMES = {
  catalog: 'catalog.json', cpCatalog: 'cp-catalog.json', schedule: 'schedule.json',
  en: 'en.json', th: 'th.json', calendarZh: 'calendar-zh.json',
  calendarEn: 'calendar-en.json', calendarTh: 'calendar-th.json', sourceContent: 'source-content.json',
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const safeAsset = value => /^assets\/[A-Za-z0-9_./%+()-]+\.(?:webp|png|jpe?g|gif|svg)$/i.test(value) && !value.split('/').includes('..');

export async function loadWebSnapshot() {
  if (!process.env.GLFANS_WEB_ROOT) throw new Error('请显式设置 GLFANS_WEB_ROOT 为正在发布的网站工作树，不能从旧 iOS 源目录导出内容。');
  const webRoot = path.resolve(process.env.GLFANS_WEB_ROOT);
  const contentRoot = path.resolve(process.env.GLFANS_APP_CONTENT_ROOT || path.join(webRoot, 'dist/client'));
  const manifestBytes = await fs.readFile(path.join(contentRoot, 'app-content/v1/manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(manifest.version) || !Number.isFinite(Date.parse(manifest.generatedAt))) throw new Error('App 内容 manifest 格式不正确。');
  if (JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify(Object.keys(FILE_NAMES).sort())) throw new Error('App 内容 manifest 数据文件不完整。');
  const expectedVersion = sha256(Buffer.from(JSON.stringify({ schemaVersion: 1, files: manifest.files, assets: manifest.assets }) + '\n'));
  if (manifest.version !== expectedVersion) throw new Error('App 内容版本摘要与 manifest 不匹配。');
  const readEntry = async entry => {
    if (!entry || !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1) throw new Error('App 内容文件校验信息无效。');
    const url = new URL(entry.url);
    if (url.origin !== 'https://glfans.com' || url.search || url.hash || !new RegExp(`^/assets/app-content/${entry.sha256}\\.[a-z0-9]+$`).test(url.pathname)) throw new Error('App 内容文件地址越界。');
    const bytes = await fs.readFile(path.join(contentRoot, url.pathname.slice(1)));
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`App 内容文件摘要不一致：${url.pathname}`);
    return bytes;
  };
  const files = {};
  for (const key of Object.keys(FILE_NAMES)) {
    const bytes = await readEntry(manifest.files[key]);
    files[key] = { bytes, value: JSON.parse(bytes) };
  }
  const assets = {};
  for (const [key, entry] of Object.entries(manifest.assets)) {
    if (!safeAsset(key)) throw new Error(`不安全的 App 图片路径：${key}`);
    assets[key] = await readEntry(entry);
  }
  if (files.catalog.value.schemaVersion !== 1 || files.cpCatalog.value.schemaVersion !== 1 || !Array.isArray(files.schedule.value.events)) throw new Error('App 内容结构不正确。');
  const catalog = files.catalog.value;
  if (catalog.collections.some(collection => collection.hidden || collection.articles.some(article => article.hidden)) || catalog.quotes.length || catalog.radio.tracks.length) throw new Error('App 快照包含未开放内容。');
  return { webRoot, contentRoot, manifest, manifestBytes, files, assets };
}

export async function copySnapshot(snapshot, destination) {
  await fs.mkdir(destination, { recursive: true });
  for (const [key, filename] of Object.entries(FILE_NAMES)) await fs.writeFile(path.join(destination, filename), snapshot.files[key].bytes);
  for (const [key, bytes] of Object.entries(snapshot.assets)) {
    const output = path.join(destination, key);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, bytes);
  }
  await fs.writeFile(path.join(destination, 'content-manifest.json'), snapshot.manifestBytes);
}
