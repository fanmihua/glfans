import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { aboutCopy } from '../../src/data/site-about.js';
import { publicArticleTranslations } from './public-columns.mjs';

export const APP_ORIGIN = 'https://glfans.com';
export const APP_FILE_NAMES = {
  catalog: 'catalog.json', cpCatalog: 'cp-catalog.json', schedule: 'schedule.json',
  en: 'en.json', th: 'th.json', calendarZh: 'calendar-zh.json',
  calendarEn: 'calendar-en.json', calendarTh: 'calendar-th.json', sourceContent: 'source-content.json',
};
const publicSections = new Set(['archive', 'cp', 'column', 'memes', 'about']);
const hiddenCpCopy = new Set(['community', 'communityNote', 'searchCommunity', 'communityPending', 'shops', 'openShop', 'openBrand', 'officialShop', 'personalBrand', 'brand', 'openRadio']);
const collectionFocus = { 'rival-lover': '50% 18%', us: '50% 58%', 'designing-love': '50% 41%', 'poisonous-love': '50% 18%', affair: '50% 40%' };
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value) + '\n');
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));

export function filterCollections(collections, formatTitle) {
  return collections.filter(collection => !collection.hidden).map(collection => ({
    ...collection,
    articles: collection.articles.filter(article => !article.hidden).map(article => ({
      ...article, displayTitle: formatTitle(collection.title, article.title),
    })),
  }));
}

// 保持原始图片路径作为稳定 key，远程内容地址由 manifest 映射。
export function publicCpDetail(value) {
  if (Array.isArray(value)) return value.map(publicCpDetail);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (key === 'responsive' || key === 'radioTrackId') return [];
    if (key === 'community') return [[key, null]];
    if (key === 'shops') return [[key, []]];
    return [[key, publicCpDetail(item)]];
  }));
}

export function collectAssetPaths(value, found = new Set()) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/assets\/[A-Za-z0-9_./%+()-]+\.(?:webp|png|jpe?g|gif|svg)/gi)) {
      const asset = match[0];
      if (asset.split('/').includes('..')) throw new Error(`Unsafe asset path: ${asset}`);
      found.add(asset);
    }
  } else if (Array.isArray(value)) value.forEach(item => collectAssetPaths(item, found));
  else if (value && typeof value === 'object') Object.values(value).forEach(item => collectAssetPaths(item, found));
  return found;
}

export async function createAppSnapshot(webRoot) {
  const read = relative => readJSON(path.join(webRoot, relative));
  const load = relative => import(pathToFileURL(path.join(webRoot, relative)).href);
  const [archive, titleModule, memes, calendar, calendarModule, editorialModule, names, routes, index] = await Promise.all([
    load('src/data/archive-dramas.js'), load('src/features/column/article-title.js'), load('src/features/memes/meme-data.js'),
    load('src/features/archive/calendar-data.js'), load('src/features/archive/calendar-copy.js'),
    load('src/i18n/editorial.js'), load('src/i18n/proper-names.js'), load('src/app/routes.js'), read('src/features/cp/generated/index.json'),
  ]);
  const columnSource = await read('src/data/column-data.json');
  const collections = filterCollections(columnSource.collections, titleModule.formatArticleTitle);
  const catalog = {
    schemaVersion: 1, years: archive.archiveYearList, archiveRepresentativeIds: archive.archiveRepresentativeIds,
    dramas: archive.archiveDramas, collections, quotes: [], memes: memes.memeCollection,
    radio: { playlistId: '', name: '', tracks: [] }, homeCards: [],
    homeLinks: routes.SITE_NAVIGATION.filter(item => publicSections.has(item.id)),
  };
  const [cpUi, cpJournal, cpNames] = await Promise.all([
    load('src/features/cp/cp-copy.js'), load('src/features/cp/cp-journal-copy.js'), load('src/features/cp/cp-names.js'),
  ]);
  const profiles = await Promise.all(index.profiles.map(async entry => {
    const detail = publicCpDetail(await read(`src/features/cp/generated/${entry.id}.json`));
    return {
      id: entry.id, label: cpNames.cpLabel(detail.cp), names: entry.names, aliases: entry.aliases || [], status: entry.status,
      searchTerms: [entry.id, cpNames.cpLabel(detail.cp), ...entry.names, ...(entry.aliases || []),
        ...entry.works.flatMap(work => [work.title, work.titleZh]), ...entry.upcoming.map(work => work.title)].filter(Boolean),
      detail,
    };
  }));
  const cleanCopy = value => Object.fromEntries(Object.entries(value).map(([locale, copy]) => [locale,
    Object.fromEntries(Object.entries(copy).filter(([key]) => !hiddenCpCopy.has(key))),
  ]));
  const cpCatalog = {
    schemaVersion: 1, verifiedAt: index.verifiedAt, statusCheckedAt: index.statusCheckedAt,
    copies: { ui: cleanCopy(cpUi.cpCopy), journal: cleanCopy(cpJournal.cpJournalCopy), status: index.cpStatusCopy, children: index.cpChildrenCopy, zodiac: index.zodiacLabels }, profiles,
  };
  const schedule = calendar.mergeCalendarData(await read('src/data/archive-history.json'), await read('src/data/archive-schedule.json'));
  const sourceContent = {
    about: {
      intro: aboutCopy.zh.intro, emphasis: '',
      rights: [
        { title: '非官方声明', text: aboutCopy.zh.declaration },
        { title: '内容与权利', text: '网站原创文字、设计、编排和代码归相应创作者所有。页面涉及的艺人姓名与肖像、 剧照、海报、节目截图、歌曲、官方视频及其他第三方素材，其相关权利归原权利人所有。 引用内容主要用于作品介绍、评论和资料整理，不代表 glfans 对相关素材拥有权利。' },
        { title: '使用边界', text: aboutCopy.zh.boundaries },
        { title: '权利反馈', text: '如您是相关权利人并对页面内容有异议，请提供具体页面地址、涉及内容与处理诉求。 请勿在公开页面提交身份证件等敏感材料；需要进一步核验时再转为非公开沟通。 我们将在核验后及时补充标注、更正、下架或断开链接。' },
      ],
      copyright: '© 2026 glfans，仅指网站原创文字、设计与代码；不涵盖艺人肖像、剧照、海报、音视频及其他第三方素材。',
    },
    footerFilm: collections.map(collection => ({ image: collection.cover, focus: collectionFocus[collection.slug] || '50% 40%' })),
    frequencyWords: [], frequencySegments: [],
  };
  const snapshot = { catalog, cpCatalog, schedule, sourceContent };
  for (const [locale, copy] of Object.entries(calendarModule.calendarCopy)) {
    const strings = Object.fromEntries(Object.entries(copy).filter(([, value]) => typeof value === 'string'));
    copy.weekdays.forEach((name, i) => { strings[`weekday${i}`] = name; });
    snapshot[{ zh: 'calendarZh', en: 'calendarEn', th: 'calendarTh' }[locale]] = strings;
  }
  for (const locale of ['en', 'th']) {
    const dictionaries = await Promise.all(['ui', 'archive', 'article'].map(async kind => {
      const dictionary = await read(`src/i18n/${locale}-${kind}.json`);
      return kind === 'article' ? publicArticleTranslations(dictionary, columnSource) : dictionary;
    }));
    const dictionary = Object.assign({}, ...dictionaries, editorialModule.editorial[locale]);
    for (const [key, text] of Object.entries(aboutCopy.zh)) dictionary[text] = aboutCopy[locale][key];
    for (const drama of archive.archiveDramas) dictionary[drama.title] = drama.titleEn || drama.title;
    for (const item of [...names.verifiedSeries, ...names.verifiedPeople]) for (const alias of item.aliases) dictionary[alias] = item[locale];
    snapshot[locale] = dictionary;
  }
  return snapshot;
}

export async function writeAppContent(webRoot, outputRoot, options = {}) {
  const snapshot = await createAppSnapshot(webRoot);
  const files = {}, assets = {};
  const publish = async (bytes, extension) => {
    const hash = sha256(bytes), relative = `assets/app-content/${hash}.${extension}`;
    const output = path.join(outputRoot, relative);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, bytes);
    return { url: `${APP_ORIGIN}/${relative}`, sha256: hash, bytes: bytes.length };
  };
  for (const key of Object.keys(APP_FILE_NAMES)) files[key] = await publish(jsonBytes(snapshot[key]), 'json');
  const assetPaths = collectAssetPaths(snapshot);
  // 与内容关联的素材之外，保留 App 现有品牌及装饰；不复制隐藏栏目的原稿素材。
  const decorations = ['assets/glfans-logo-brush.webp', 'assets/mobile-nav-paper.webp', 'assets/repo-handdrawn-heart-pink.webp',
    'assets/repo-handdrawn-underline-pink.webp', 'assets/repo-collection-black-torn-v2.webp', 'assets/about/annotation-loop-arrow-v1.webp',
    'assets/meme-game/meme-camera-three-quarter-empty-v2.webp', 'assets/repo-collection-pink-brush-v1.webp',
    'assets/repo-article-card-frame-a-v1.webp', 'assets/repo-article-card-frame-b-v1.webp',
    'assets/repo-collection-poster-frame-v1.webp', 'assets/repo-hero-ghost-word.webp', 'assets/editorial-paper-bg.webp'];
  decorations.forEach(asset => assetPaths.add(asset));
  for (const asset of [...assetPaths].sort()) {
    const bytes = await fs.readFile(path.join(webRoot, 'public', asset));
    assets[asset] = await publish(bytes, path.extname(asset).slice(1).toLowerCase());
  }
  const version = sha256(jsonBytes({ schemaVersion: 1, files, assets }));
  const sourceCommit = options.sourceCommit ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: webRoot, encoding: 'utf8' }).trim();
  const manifest = { schemaVersion: 1, version, generatedAt: options.generatedAt ?? new Date().toISOString(), sourceCommit, files, assets };
  const manifestPath = path.join(outputRoot, 'app-content/v1/manifest.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, jsonBytes(manifest));
  return manifest;
}
