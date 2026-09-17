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

const image = await thumbnail('assets/glfans-logo-brush.webp', 'contain');
const introductions = {
  archive:'沿着年份翻阅泰百剧集，重温故事，也找到下一部想追的剧。',
  calendar:'查看已公布的泰百剧集逐集排期，按日期浏览播出信息。',
  cp:'认识她们，收藏共同作品、音乐与舞台，记录两个人的来时路。',
  about:'由粉丝维护的非官方、非商业泰百影视资料站，整理剧集、播出排期与演员公开资料。',
};
const description = '泰百影视资料站：考古档案、播出日历与百家饭，整理剧集、已公布排期及演员公开资料。';
async function emit(route, data) {
  const directory = `${root}/${route}`;
  await mkdir(directory,{recursive:true});
  await writeFile(`${directory}/index.html`,page(data));
  await writeFile(`${directory}/share.json`,JSON.stringify(data));
}
await emit('',{title:'glfans · 每一种喜欢，都值得被认真记录',description,image,url:`${origin}${base}`});
for (const nav of SITE_NAVIGATION.filter(item=>['archive','cp','about'].includes(item.id))) {
  await emit(nav.id,{title:`glfans · ${nav.label}`,description:introductions[nav.id],image,url:`${origin}${base}${nav.id}/`});
}
for (const cp of profiles) {
  await emit(`cp/${cp.id}`,{title:'glfans · 百家饭',description:`${cpLabel(cp)}｜${introductions.cp}`,image,url:`${origin}${base}cp/${cp.id}/`});
}
await emit('about/rights',{title:'glfans · 关于',description:`权利说明与反馈｜${introductions.about}`,image,url:`${origin}${base}about/rights/`});
await emit('archive/calendar',{title:'glfans · 播出日历',description:introductions.calendar,image,url:`${origin}${base}archive/calendar/`});
for (const year of new Set(archiveDramas.map(work=>work.year))) {
  await emit(`archive/${year}`,{title:'glfans · 考古档案',description:`${year} 年度胶卷｜${introductions.archive}`,image,url:`${origin}${base}archive/${year}/`});
}
for (const work of archiveDramas) {
  const route=`archive/${work.year}/${work.id}`;
  await emit(route,{title:'glfans · 考古档案',description:`${work.title} · ${work.titleEn}｜${introductions.archive}`,
    image,url:`${origin}${base}${route}/`});
}
console.log('Generated share pages for archive, calendar, CPs, about and retained detail pages.');
