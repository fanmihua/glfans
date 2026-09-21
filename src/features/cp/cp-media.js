// Editorial selection, verified against publisher credits on 2026-09-10.
// CP association does not imply that both members sing every song.
import { cpProfiles } from './cp-data.js';
import trailers from './cp-trailers.json' with { type: 'json' };
export const mediaCheckedAt = '2026-09-10';
// Official YouTube publication dates; these are not inferred album release dates.
const videoMilestones = {
  AUPbHx7J8iQ: { date: '2026-09-12', memberIndex: 1 },
  hsvQg5JSDHU: { date: '2024-11-09', memberIndex: 0 },
  saSPFSwHbrk: { date: '2024-12-07', memberIndex: 1 },
  BG_yN4HCr44: { date: '2025-02-01', memberIndex: 1 },
  ID_pd9Ni3nk: { date: '2025-02-27', memberIndex: 0 },
  x5hkD526A5M: { date: '2026-02-24' },
  'jad-V_nyvaY': { date: '2026-08-10' },
};
const yt = (id, cpId, title, performers, scope, workId, publisher = 'GMMTV RECORDS', category = 'music') => ({
  id, cpId, title, performers, scope, workId, publisher, category,
  ...videoMilestones[id],
  kind: category === 'music' ? 'mv' : 'special',
  url: `https://www.youtube.com/watch?v=${id}`, source: `https://www.youtube.com/watch?v=${id}`,
  image: `assets/cp/media/${id}.jpg`, imageSource: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
});
const album = (id, cpId, title, performers, scope, workId, publisher, date, slug, imageSource, memberIndex = null) => ({
  id, cpId, title, performers, scope, workId, publisher, date, category: 'music', kind: 'single',
  url: `https://music.apple.com/us/album/${slug}/${id}`, source: `https://music.apple.com/us/album/${slug}/${id}`,
  image: `assets/cp/media/${id}.jpg`, imageSource, square: true, memberIndex,
  ...(id === '1840114672' ? { radioTrackId: 'netease:2757267299' } : {}),
});
export const cpMedia = [
  yt('AUPbHx7J8iQ', 'emibonnie', 'จะรักให้จำ (Your One)', ['Bonnie Pattraphus'], 'solo', 'moonshadow', 'RISER MUSIC'),
  yt('0teLUM61UMY', 'milklove', 'ช็อตฟีล (Shot-Feel)', ['Milk Pansa', 'Love Pattranite'], 'duet', null),
  yt('27klSLsVCR4', 'janjingjing', 'ระยะใกล้รัก (Afraid)', ['Jingjing Yu'], 'solo', 'enemies-with-benefits'),
  ...[
    ['sqc_BI1rbd0', 'SECRET DEAL'],
    ['6c_5xPYxmy4', 'ONLY WE KNOW'],
    ['6-JaE1RZv9I', 'แค่รักก็มากพอ'],
  ].map(([id,title]) => ({ ...yt(id, 'lookmheesonya', title, ['Lookmhee Punyapat', 'Sonya Saranphat'], 'duet', 'harmony-secret', 'CHANGE2561'), kind: 'officialAudio' })),
  yt('jad-V_nyvaY', 'emibonnie', 'Red Kiss', ['Emi Thasorn', 'Bonnie Pattraphus'], 'duet', null, 'RISER MUSIC'),
  yt('AMzlTbjBLDo', 'namtanfilm', "เรื่องเล่าของเจ้าหญิง (A Princess’ Tale)", ['Namtan Tipnaree', 'Film Rachanun'], 'duet', 'pluto'),
  yt('I_wl4yurk1U', 'namtanfilm', 'พลูโต (Pluto)', ['Namtan Tipnaree', 'Film Rachanun'], 'duet', 'pluto'),
  yt('hsvQg5JSDHU', 'namtanfilm', 'นิยายเรื่องเธอ (Your Story)', ['Namtan Tipnaree'], 'solo', 'pluto'),
  yt('saSPFSwHbrk', 'namtanfilm', 'รอนะ (Linger)', ['Film Rachanun'], 'solo', 'pluto'),
  yt('x5hkD526A5M', 'emibonnie', 'ยิ่งชิดยิ่งคิด (Fall For You)', ['Emi Thasorn', 'Bonnie Pattraphus'], 'duet', null, 'RISER MUSIC'),
  yt('YF30_ksQ8qg', 'emibonnie', 'ไม่อยากจูบเธอในฝัน (Kissin’ Out of Dream)', ['Emi Thasorn', 'Bonnie Pattraphus'], 'duet', 'us'),
  yt('BG_yN4HCr44', 'emibonnie', 'Between Us', ['Bonnie Pattraphus'], 'solo', 'us'),
  yt('ID_pd9Ni3nk', 'emibonnie', 'มากกว่าที่รัก (More Than Words)', ['Emi Thasorn'], 'solo', 'us'),
  yt('xWvhq6bsde8', 'janjingjing', 'งั้นรักละ (Don’t wanna, But I Do)', ['Jan Ployshompoo', 'Jingjing Yu'], 'duet', 'enemies-with-benefits'),
  yt('MeEqOOH-2eE', 'janjingjing', 'Wine I hate you?', ['Jan Ployshompoo', 'Jingjing Yu'], 'duet', 'enemies-with-benefits'),
  album('1835834682', 'ginjay', 'So This Is Love', ['Ginny', 'JAYNA'], 'duet', 'poisonous-love', 'North Star Music', '2025-10-04', 'so-this-is-love-from-%E0%B8%9E-%E0%B8%A9%E0%B8%A3-%E0%B8%81-poisonous-love-single', 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/25/03/c7/2503c7d6-6468-6290-ea9a-c7a9bbfeb657/cover.jpg/1200x1200bb.jpg'),
  album('1840114672', 'ginjay', 'เธอคือคำตอบ (The World Of Us)', ['GINNY'], 'solo', 'poisonous-love', 'North Star Music', '2025-09-20', '%E0%B9%80%E0%B8%98%E0%B8%AD%E0%B8%84-%E0%B8%AD%E0%B8%84%E0%B8%B3%E0%B8%95%E0%B8%AD%E0%B8%9A-the-world-of-us-from-%E0%B8%9E-%E0%B8%A9%E0%B8%A3-%E0%B8%81-poisonous-love-single', 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/b3/ed/61/b3ed616d-bf46-fc43-dab0-b94beab45edd/cover.jpg/1200x1200bb.jpg', 0),
  album('1841898283', 'janekao', 'ออกแบบรัก (Love Design)', ['Kao Supassara', 'Janeeyeh Methika'], 'duet', 'love-design', 'VelCurve Studio', '2025-10-01', '%E0%B8%AD%E0%B8%AD%E0%B8%81%E0%B9%81%E0%B8%9A%E0%B8%9A%E0%B8%A3-%E0%B8%81-love-design-from-%E0%B8%A3-%E0%B8%9A-%E0%B8%A3-%E0%B8%81-%E0%B8%AD%E0%B8%AD%E0%B8%81%E0%B9%81%E0%B8%9A%E0%B8%9A-single', 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/50/95/63/50956336-fa06-0e46-769a-3552b81204f4/cover.jpg/1200x1200bb.jpg'),
  yt('sU1Fiqt4Qe4', 'namtanfilm', 'Pluto นิทาน ดวงดาว ความรัก Special', ['Namtan Tipnaree', 'Film Rachanun'], 'cast', 'pluto', 'GMMTV OFFICIAL', 'video'),
  yt('GcZ6rI98sUs', 'emibonnie', 'The Story of Us รักของเรา [1/4]', ['Emi Thasorn', 'Bonnie Pattraphus'], 'cast', 'us', 'GMMTV OFFICIAL', 'video'),
  yt('feXI6IYWor0', 'emibonnie', 'Moonshadow Special [1/4]', ['Emi Thasorn', 'Bonnie Pattraphus'], 'cast', 'moonshadow', 'GMMTV OFFICIAL', 'video'),
  yt('nJU9vEfR7Go', 'faymay', 'FAYMAY’s Vlog | Huahin', ['Fay Kanyaphat', 'May Yada'], 'cast', null, 'FAYMAY entertainment', 'video'),
  ...trailers.flatMap(item => cpProfiles.filter(cp => cp.works.some(work => work.id === item.workId)).map(cp => ({
    ...yt(item.id, cp.id, item.title, cp.members.map(member => member.name), 'cast', item.workId, item.publisher, 'video'),
    id: `${item.id}-${cp.id}`, kind: 'trailer', date: item.date,
  }))),
];
export const mediaForCp = cpId => cpMedia.filter(item => item.cpId === cpId);
