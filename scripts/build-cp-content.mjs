// Editorial sources remain the single source of truth. Browser payloads are
// derived at build/dev start; no manual second copy of profiles is maintained.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { cpProfiles, verifiedAt } from '../src/features/cp/cp-data.js';
import { profileForMember, zodiacForBirthday, zodiacLabels } from '../src/features/cp/member-profiles.js';
import { cpLabel } from '../src/features/cp/cp-names.js';
import { statusForCp, cpStatusCopy, statusCheckedAt } from '../src/features/cp/cp-status.js';
import { childForCp, cpChildrenCopy } from '../src/features/cp/cp-children.js';
import { timelineForCp, personalMilestones, noticeForCp } from '../src/features/cp/cp-timeline.js';
import { mediaForCp } from '../src/features/cp/cp-media.js';
import { cpCommunities } from '../src/features/cp/cp-communities.js';
import { archiveDramas } from '../src/data/archive-dramas.js';

const target = 'src/features/cp/generated';
await mkdir(target, { recursive: true });
await mkdir('public/assets/cp/responsive', { recursive: true });
const sameWrite = async (path, content) => {
  if (await readFile(path, 'utf8').catch(() => null) !== content) await writeFile(path, content);
};
const archive = new Map(archiveDramas.map(work => [work.id, work]));
const images = new Map();
async function imageVariants(source, requestedWidths=[480,960,1440]) {
  if (!images.has(source)) images.set(source, (async () => {
    const input = await readFile(`public/${source}`);
    const signature = createHash('sha256').update(input).update('webp-q84-v1').digest('hex').slice(0, 16);
    const meta = await sharp(input).metadata();
    const widths = [...new Set(requestedWidths.map(w => Math.min(w, meta.width)))];
    const variants = [];
    for (const width of widths) {
      const path = `assets/cp/responsive/${signature}-${width}.webp`;
      try { await readFile(`public/${path}`); }
      catch { await sharp(input).rotate().resize({width, withoutEnlargement:true}).webp({quality:84}).toFile(`public/${path}`); }
      variants.push({width, path});
    }
    return variants;
  })());
  return images.get(source);
}

await imageVariants('assets/glfans-logo-brush.webp',[160,320,640]);
await imageVariants('assets/repo-handdrawn-heart-pink.webp',[160,320,640]);
const paper = await imageVariants('assets/repo-collection-black-torn-v2.webp',[480,960]);
await sameWrite(`${target}/chrome.css`, `@media (max-width:760px){.app-shell--cp .mobile-section-nav::before{background-image:url('/${paper[1].path}');}}\n`);
const directory = [];
for (const original of cpProfiles) {
  const cp = {...original, members:original.members.map(member => {
    const profile = profileForMember(member);
    return {...member, profile:{...profile, sign:zodiacForBirthday(profile.birthday || (profile.birthdayMonthDay ? `2000-${profile.birthdayMonthDay}` : null))}};
  })};
  const media = mediaForCp(cp.id);
  const timeline = timelineForCp(cp, media);
  const ids = new Set([...cp.works.map(w=>w.id), ...media.map(m=>m.workId), ...timeline.map(t=>t.workId)].filter(Boolean));
  const works = [...ids].map(id=>archive.get(id)).filter(Boolean);
  const child = childForCp(cp.id);
  const sources = new Set(['assets/glfans-logo-brush.webp','assets/repo-handdrawn-heart-pink.webp',cp.image, ...works.map(w=>w.image), ...(cp.upcoming || []).map(w=>w.image), ...media.map(m=>m.image), ...cp.events.map(e=>e.image), child?.image, child?.video.image].filter(Boolean));
  const responsive = Object.fromEntries(await Promise.all([...sources].map(async s=>[s, await imageVariants(s)])));
  const data = {cp, media, timeline, works, child, notice:noticeForCp(cp.id), milestones:personalMilestones[cp.id] || [], collaboration:statusForCp(cp.id), community:cpCommunities[cp.id] || null, responsive};
  await sameWrite(`${target}/${cp.id}.json`, JSON.stringify(data)+'\n');
  directory.push({id:cp.id, names:cp.names, aliases:cp.aliases || [], members:cp.members.map(m=>({name:m.name})), works:cp.works.map(w=>({id:w.id,title:w.title,titleZh:archive.get(w.id)?.title || ''})), upcoming:(cp.upcoming || []).map(w=>({title:w.title})), status:statusForCp(cp.id).status});
}
await sameWrite(`${target}/index.json`, JSON.stringify({profiles:directory,verifiedAt,statusCheckedAt,cpStatusCopy,cpChildrenCopy,zodiacLabels})+'\n');
console.log(`CP content: ${directory.length} lazy detail payloads; ${images.size} responsive source images. Editorial sources unchanged.`);
