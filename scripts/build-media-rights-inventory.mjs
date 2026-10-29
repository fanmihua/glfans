import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cpProfiles } from '../src/features/cp/cp-data.js';
import { cpMedia as cpJournalMedia } from '../src/features/cp/cp-media.js';
import { cpNotices } from '../src/features/cp/cp-timeline.js';
import { cpChildren } from '../src/features/cp/cp-children.js';
import { memeCollection } from '../src/features/memes/meme-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const columnData = JSON.parse(await readFile(path.join(root, "src/data/column-data.json"), "utf8"));
const neteasePlaylist = JSON.parse(await readFile(path.join(root, "src/data/netease-playlist.json"), "utf8"));

function xmlImages(xml = "", context) {
  return Array.from(xml.matchAll(/<img\b([^>]*)\/?\s*>/g), (match) => {
    const attrs = Object.fromEntries(Array.from(match[1].matchAll(/([\w-]+)="([^"]*)"/g), (item) => [item[1], item[2]]));
    return {
      id: `${context.kind}:${context.slug}:${attrs.href}`,
      path: attrs.href,
      category: "article-reference-image",
      context,
      sourceName: attrs.name || null,
      sourceAssetId: attrs.src || null,
      rightsStatus: "source-audit-required",
      useBasis: "commentary-and-reference",
      publicDownload: false,
    };
  });
}

const articleMedia = columnData.collections.flatMap((collection) => [
  ...xmlImages(collection.summaryXml, { kind: "collection", slug: collection.slug, title: collection.title }),
  ...collection.articles.flatMap((article) => xmlImages(article.xml, {
    kind: "article",
    slug: `${collection.slug}/${article.slug}`,
    title: article.title,
  })),
]);
const dedupedArticleMedia = Array.from(new Map(articleMedia.map((item) => [item.path, item])).values());

const homePairs = ["freenbecky", "lingorm", "emibonnie", "janjingjing", "namtanfilm", "janekao", "ginjay"];
const homeMedia = homePairs.map((pair) => ({
  id: `home:${pair}`,
  path: `assets/home/${pair}-card-v1.webp`,
  category: "celebrity-collage",
  context: { kind: "home", slug: pair },
  rightsStatus: "source-audit-required",
  useBasis: "editorial-collage",
  publicDownload: false,
}));

export const aboutMedia = [{
  id: 'about:gl-badge-about1',
  path: 'assets/about/about1-gl-badge-7fe2179805130efd.webp',
  category: 'site-brand-decoration',
  context: { kind: 'about', slug: 'about1-badge', title: '《关于1》GL徽章' },
  sourcePlatform: 'Figma',
  sourceUrl: 'https://www.figma.com/design/k7IDvpJwJ1zkvpiEug1LlX/?node-id=27-111',
  sourceFrame: '27:163',
  sourceNode: '27:111',
  sourceSha256: 'c0f0522abd11443c6ff8daa618f392eb5c6fd38dbe9ebb5409364b8ee0335301',
  sha256: '7fe2179805130efd5e0d154654705db84d2fbcd7eb51ec5978d7e33cac8c6e5b',
  width: 768, height: 768, bytes: 43850, hasAlpha: true,
  rightsStatus: 'user-authorized-design',
  useBasis: 'user-selected-figma-brand-decoration',
  publicDownload: false,
  checkedAt: '2026-10-29',
}];

const memeMedia = memeCollection.map((meme) => ({
  id: `meme:${meme.id}`,
  path: meme.src,
  category: "third-party-meme",
  context: { kind: "meme-pool", slug: "feishu-original" },
  sourceCollection: "飞书原版表情包库",
  sourceUrl: meme.sourceDocument || 'https://my.feishu.cn/wiki/PhUpwFtESiOYaVkMlwEcsqg4nWf',
  rightsStatus: "source-audit-required",
  publicDownload: false,
}));

const radioMedia = neteasePlaylist.tracks.filter((track) => track.playable).map((track) => ({
  id: `radio:netease:${track.id}`,
  category: "external-audio-stream",
  context: { kind: "radio", slug: track.cpId, title: track.name },
  sourcePlatform: "网易云音乐",
  sourceUrl: track.officialUrl,
  rightsStatus: "external-stream-only",
  publicDownload: false,
}));

const cpMedia = cpProfiles.flatMap(cp => [...cp.events, ...(cp.upcoming || [])].filter(event => event.image).map(event => ({
  id: `cp-media:${cp.id}:${event.image}`, path: event.image, category: 'official-editorial-image',
  context: { kind: 'cp', slug: cp.id, title: event.title }, sourceUrl: event.source,
  sourceImageUrl: event.imageSource, rightsHolder: event.publisher,
  rightsStatus: 'source-audit-required', useBasis: 'editorial-reference-with-official-source', publicDownload: false,
})));
const cpJournalImages = [...cpJournalMedia.map(item => ({
  id: `cp-journal:${item.id}`, path: item.image, category: 'official-editorial-image',
  context: { kind: 'cp', slug: item.cpId, title: item.title }, sourceUrl: item.source,
  sourceImageUrl: item.imageSource, rightsHolder: item.publisher,
  rightsStatus: 'source-audit-required', useBasis: 'editorial-reference-with-official-source', publicDownload: false,
})), ...Object.entries(cpNotices).flatMap(([cpId, notice]) => notice.images.map(item => ({
  id: `cp-notice:${notice.id}:${item.language}`, path: item.image, category: 'official-announcement',
  context: { kind: 'cp', slug: cpId, title: notice.id }, sourceUrl: notice.source,
  sourceImageUrl: item.source, rightsHolder: notice.publisher,
  rightsStatus: 'source-audit-required', useBasis: 'editorial-reference-with-official-source', publicDownload: false,
})))];
const childImages = Object.entries(cpChildren).flatMap(([cpId, child]) => [child, child.video].map((item, index) => ({
  id: `cp-child:${cpId}:${index}`, path: item.image, category: 'official-editorial-image',
  context: { kind: 'cp', slug: cpId, title: child.name }, sourceUrl: item.source || item.url,
  sourceImageUrl: item.imageSource, rightsHolder: item.publisher,
  rightsStatus: 'source-audit-required', useBasis: 'editorial-reference-with-official-source', publicDownload: false,
})));
const assets = [...homeMedia, ...dedupedArticleMedia, ...memeMedia, ...radioMedia, ...cpMedia, ...cpJournalImages, ...childImages, ...aboutMedia];
export const inventory = {
  policyVersion: "2026-09-02",
  generatedAt: new Date().toISOString(),
  feedbackUrl: "https://github.com/fanmihua/glfans/issues/new?template=rights-feedback.yml",
  statusDefinitions: {
    "source-audit-required": "公开前仍需核对原始来源、权利主体与使用边界；默认关闭下载。",
    "external-stream-only": "仅调用平台提供的外部音频地址并保留歌曲页面入口；不得下载、转存或自行托管。",
    "user-authorized-design": "用户已明确选择并授权用于本站的设计装饰；不自动开放下载或第三方复用。",
  },
  summary: {
    total: assets.length,
    home: homeMedia.length,
    articleImages: dedupedArticleMedia.length,
    memes: memeMedia.length,
    radioTracks: radioMedia.length,
    cpImages: cpMedia.length + cpJournalImages.length + childImages.length,
    aboutImages: aboutMedia.length,
  },
  assets,
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeFile(path.join(root, "docs/media-rights-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  console.log(`rights inventory: ${inventory.summary.total} assets`);
}
