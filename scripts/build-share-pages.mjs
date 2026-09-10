import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { cpLabel } from '../src/features/cp/cp-names.js';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { SITE_NAVIGATION } from '../src/app/routes.js';

const root = 'dist/client';
const base = `/${(process.env.VITE_BASE_PATH || '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
const origin = 'https://glfans.com';
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const template = await readFile(`${root}/index.html`, 'utf8');
const { profiles } = JSON.parse(await readFile('src/features/cp/generated/index.json', 'utf8'));
await mkdir(`${root}/assets/share`, { recursive: true });

function page({title, description, image, url}) {
  const tags = [
    ['property','og:title',title], ['property','og:description',description],
    ['property','og:url',url], ['property','og:image',image],
    ['property','og:image:type','image/jpeg'], ['property','og:image:width','512'],
    ['property','og:image:height','512'], ['property','og:image:alt',title],
    ['name','twitter:card','summary'], ['name','twitter:title',title],
    ['name','twitter:description',description], ['name','twitter:image',image],
  ].map(([key,name,value]) => `<meta ${key}="${name}" content="${escape(value)}" />`).join('\n    ');
  return template.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(description)}" />`)
    .replace(/<meta property="og:url"[^>]*\/>/, tags)
    .replace(/<link rel="canonical"[^>]*\/>/, `<link rel="canonical" href="${escape(url)}" />`);
}

async function thumbnail(source, fit) {
  const input = await readFile(`public/${source}`);
  const hash = createHash('sha256').update(input).update(`share-square-v1-${fit}`).digest('hex').slice(0,16);
  const path = `assets/share/${hash}.jpg`;
  await sharp(input).rotate().resize(512,512,{fit,background:'#f7f7f4'})
    .flatten({background:'#f7f7f4'}).jpeg({quality:88,mozjpeg:true}).toFile(`${root}/${path}`);
  return `${origin}${base}${path}`;
}

for (const profile of profiles) {
  const {cp, works} = JSON.parse(await readFile(`src/features/cp/generated/${profile.id}.json`, 'utf8'));
  // Real CP sticker first; otherwise a real shared-work poster, then site logo.
  const source = cp.image || works.find(work=>work.image)?.image || 'assets/glfans-logo-brush.webp';
  const image = await thumbnail(source, cp.image || !works.some(work=>work.image) ? 'contain' : 'cover');
  await emit(`cp/${cp.id}`, {
    title:`${cpLabel(cp)} · 百家饭 · glfans`, description:cp.intro.zh,
    image, url:`${origin}${base}cp/${cp.id}/`,
  });
}
const image = await thumbnail('assets/glfans-logo-brush.webp', 'contain');
async function sectionMark(lines, kicker) {
  // Text-led sections have no single photograph: use their own editorial title,
  // not an unrelated CP or an arbitrary user-submitted quote.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#f7f7f4"/><path d="M40 58H472" stroke="#ff4fa4" stroke-width="12"/><text x="40" y="118" font-family="sans-serif" font-size="24" font-weight="bold" fill="#111">${escape(kicker)}</text>${lines.map((line,i)=>`<text x="36" y="${236+i*98}" font-family="sans-serif" font-weight="900" font-size="80" fill="${i ? '#ff4fa4' : '#111'}">${escape(line)}</text>`).join('')}<text x="40" y="465" font-family="sans-serif" font-weight="bold" font-size="32" fill="#111">glfans</text></svg>`;
  const hash=createHash('sha256').update(svg).digest('hex').slice(0,16);
  const path=`assets/share/${hash}.jpg`;
  await sharp(Buffer.from(svg)).jpeg({quality:88,mozjpeg:true}).toFile(`${root}/${path}`);
  return `${origin}${base}${path}`;
}
const sectionImages = {
  archive:await sectionMark(['考古','档案'],'PIT ARCHIVE'),
  cp:await sectionMark(['百家饭'],'CP ARCHIVE'),
  'tide-words':await sectionMark(['坑底','文学'],'VOICES FROM THE PIT'),
  column:await thumbnail('assets/repo-hero-note-collage-v3.webp','contain'),
  memes:await thumbnail('assets/meme-game/meme-camera-three-quarter-empty-v2.webp','contain'),
  radio:await thumbnail('assets/pit-radio/turntable-chassis-record-backing-v3.webp','contain'),
  about:image,
};
const description = '泰百粉丝共创档案：百家饭、考古档案、播出日历、坑底文学、REPO 与电台。';
async function emit(route, data) {
  const directory = `${root}/${route}`;
  await mkdir(directory,{recursive:true});
  await writeFile(`${directory}/index.html`,page(data));
  await writeFile(`${directory}/share.json`,JSON.stringify(data));
}
await emit('',{title:'glfans · 每一种喜欢，都值得被认真记录',description,image,url:`${origin}${base}`});
for (const nav of SITE_NAVIGATION.filter(item=>item.id!=='home')) {
  await emit(nav.id,{title:`${nav.label} · glfans`,description,image:sectionImages[nav.id],url:`${origin}${base}${nav.id}/`});
}
await emit('about/rights',{title:'权利说明与反馈 · glfans',description,image,url:`${origin}${base}about/rights/`});
for (const year of new Set(archiveDramas.map(work=>work.year))) {
  await emit(`archive/${year}`,{title:`${year} · 考古档案 · glfans`,description:`在 ${year} 的泰百剧集里，重温那些心动瞬间。`,image:await sectionMark([String(year),'胶卷'],'YEAR ARCHIVE'),url:`${origin}${base}archive/${year}/`});
}
for (const work of archiveDramas) {
  const route=`archive/${work.year}/${work.id}`;
  await emit(route,{title:`${work.title} · ${work.titleEn} · glfans`,description:work.summary || description,
    image:work.image ? await thumbnail(work.image,'cover') : image,url:`${origin}${base}${route}/`});
}
const {collections}=JSON.parse(await readFile('src/data/column-index.json','utf8'));
for (const collection of collections) {
  const route=`column/${collection.slug}`;
  await emit(route,{title:`${collection.title} · REPO 文专栏 · glfans`,description:`关于《${collection.title}》的观剧记录与心动片段。`,
    image:collection.cover ? await thumbnail(collection.cover,'cover') : image,url:`${origin}${base}${route}/`});
  for (const article of collection.articles.filter(article=>!article.hidden)) {
    const articleRoute=`${route}/${article.slug}`;
    await emit(articleRoute,{title:`${article.title} · glfans`,description:article.label || collection.title,
      image:article.cover ? await thumbnail(article.cover,'cover') : image,url:`${origin}${base}${articleRoute}/`});
  }
}
console.log('Generated share pages for all public sections, CPs, archive years/works and REPO articles.');
