import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cpProfiles } from '../src/features/cp/cp-data.js';
import { cpMedia as cpJournalMedia } from '../src/features/cp/cp-media.js';
import { cpNotices } from '../src/features/cp/cp-timeline.js';
import { cpChildren } from '../src/features/cp/cp-children.js';

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

const memeFiles = [
  "reaction-no-serious.webp",
  "reaction-no-emotion.webp",
  "reaction-light-relaxed.webp",
  "reaction-many-lesbians.webp",
  "reaction-failed-lesbian.webp",
];
const memeMedia = memeFiles.map((filename) => ({
  id: `meme:${filename.replace(/\.webp$/, "")}`,
  path: `assets/fan-memes/${filename}`,
  category: "third-party-meme",
  context: { kind: "meme-pool", slug: "feishu-original" },
  sourceCollection: "飞书原版表情包库",
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
const assets = [...homeMedia, ...dedupedArticleMedia, ...memeMedia, ...radioMedia, ...cpMedia, ...cpJournalImages, ...childImages];
const inventory = {
  policyVersion: "2026-09-02",
  generatedAt: new Date().toISOString(),
  feedbackUrl: "https://github.com/fanmihua/glfans/issues/new?template=rights-feedback.yml",
  statusDefinitions: {
    "source-audit-required": "公开前仍需核对原始来源、权利主体与使用边界；默认关闭下载。",
    "external-stream-only": "仅调用平台提供的外部音频地址并保留歌曲页面入口；不得下载、转存或自行托管。",
  },
  summary: {
    total: assets.length,
    home: homeMedia.length,
    articleImages: dedupedArticleMedia.length,
    memes: memeMedia.length,
    radioTracks: radioMedia.length,
    cpImages: cpMedia.length + cpJournalImages.length + childImages.length,
  },
  assets,
};

await writeFile(path.join(root, "docs/media-rights-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
console.log(`rights inventory: ${inventory.summary.total} assets`);
