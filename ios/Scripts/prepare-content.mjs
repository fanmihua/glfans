import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { archiveDramas, archiveRepresentativeIds, archiveYearList } from '../../src/data/archive-dramas.js';
import { collectedQuotes } from '../../src/data/tide-words.js';
import { memeCollection } from '../../src/features/memes/meme-data.js';
import { welcomeLinks } from '../../src/app/routes.js';
import { homeCpCards } from '../../src/features/home/home-content.js';
import { mergeCalendarData } from '../../src/features/archive/calendar-data.js';
import { editorial } from '../../src/i18n/editorial.js';
import { communityCopy } from '../../src/i18n/community-copy.js';
import { verifiedSeries, verifiedPeople } from '../../src/i18n/proper-names.js';

const ios = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(ios);
const generated = path.join(ios, 'Generated');
fs.mkdirSync(generated, { recursive: true });
const readJSON = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const source = readJSON('src/data/column-data.json');
// 与网站一致：隐藏草稿不得进入 App 包或深链接。
const collections = source.collections.map(c => ({ ...c, articles: c.articles.filter(a => !a.hidden) }));
const radio = readJSON('src/data/netease-playlist.json');
const catalog = { schemaVersion: 1, years: archiveYearList, archiveRepresentativeIds, dramas: archiveDramas, collections,
  quotes: collectedQuotes, memes: memeCollection, radio, homeCards: homeCpCards, homeLinks: welcomeLinks };
fs.writeFileSync(path.join(generated, 'catalog.json'), JSON.stringify(catalog));
const schedule = mergeCalendarData(readJSON('src/data/archive-history.json'), readJSON('src/data/archive-schedule.json'));
fs.writeFileSync(path.join(generated, 'schedule.json'), JSON.stringify(schedule));
for (const locale of ['en', 'th']) {
  const dictionary = Object.assign({}, ...['ui', 'archive', 'article'].map(kind => readJSON(`src/i18n/${locale}-${kind}.json`)), editorial[locale], communityCopy[locale]);
  for (const [key, values] of Object.entries(readJSON('ios/Scripts/native-copy.json'))) dictionary[key] ??= values[locale === 'en' ? 0 : 1];
  for (const drama of archiveDramas) dictionary[drama.title] = drama.titleEn || drama.title;
  for (const item of [...verifiedSeries, ...verifiedPeople]) for (const alias of item.aliases) dictionary[alias] = item[locale];
  fs.writeFileSync(path.join(generated, `${locale}.json`), JSON.stringify(dictionary));
}

const assets = path.join(root, 'public/assets');
let count = 0;
function syncDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const sourcePath = path.join(directory, entry.name);
    if (entry.isDirectory()) { syncDirectory(sourcePath); continue; }
    if (!/\.(webp|png|jpe?g)$/i.test(entry.name)) continue;
    const relative = path.relative(assets, sourcePath);
    const output = path.join(generated, 'assets', relative.replace(/\.webp$/i, '.png'));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    if (!fs.existsSync(output) || fs.statSync(output).mtimeMs < fs.statSync(sourcePath).mtimeMs) {
      if (/\.webp$/i.test(entry.name)) {
        // ImageIO/sips 转换文件格式，保持像素与透明度，供 UIImage 本地加载。
        execFileSync('/usr/bin/sips', ['-s', 'format', 'png', sourcePath, '--out', output], { stdio: 'pipe' });
      } else fs.copyFileSync(sourcePath, output);
    }
    count++;
  }
}
syncDirectory(assets);
const references = [...JSON.stringify(catalog).matchAll(/assets\/[^"<>\\]+\.(?:webp|png|jpe?g)/g)].map(m => m[0]);
for (const reference of new Set(references)) {
  if (!fs.existsSync(path.join(root, 'public', reference))) throw new Error(`缺失内容图片：${reference}`);
}
console.log(`iOS 内容：${archiveDramas.length} 剧集 / ${collections.length} 合集 / ${collections.reduce((n,c)=>n+c.articles.length,0)} 可见文章 / ${count} 图片`);
