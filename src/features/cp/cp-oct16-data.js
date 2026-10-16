import { archiveDramas } from '../../data/archive-dramas.js';

// 读者补充后逐组核对的荧幕关系。沿用剧集 ID 与已有演员身份，
// 不根据同剧出演推断搭档，也不把资料站的“已拆”直接当作官方终止。
export const oct16CheckedAt = '2026-10-16';
const archive = new Map(archiveDramas.map(work => [work.id, work]));
export const oct16PairSource = 'https://glthai.com/couple/';

export function oct16Work(id, source, roles, relationship = 'supporting') {
  const drama = archive.get(id);
  if (!drama) throw new Error(`Unknown October CP work: ${id}`);
  return { id, title: drama.titleEn, year: drama.year, source, roles, relationship, checkedAt: oct16CheckedAt };
}

export const oct16PairDefinitions = [
  { id: 'mewrenee', names: ['Mew', 'Renée'], members: ['Mew Thanthip Thaweesinthanat', 'Renée Veronica Pagano'], workId: 'poisonous-love', roles: ['Bow', 'Sita'], source: 'https://glthai.com/couple/' },
  { id: 'viewjune', names: ['View', 'June'], members: ['View Benyapa Jeenprasom', 'June Wanwimol Jaenasavamethee'], workId: '23-5', roles: ['Aylin', 'Luna'], source: 'https://www.telasa.co.jp/wp-content/uploads/2024/02/0223_news.pdf' },
  { id: 'junemewnich', names: ['June', 'Mewnich'], members: ['June Wanwimol Jaenasavamethee', 'Mewnich Nannaphas Loetnamchoetsakun'], workId: 'whale-store-xoxo', roles: ['Tonnam', 'Chompoo'], source: 'https://www.gmm-tv.com/news/3811/' },
  { id: 'noonpraewa', names: ['Noon', 'Praewa'], members: ['Noon Thunyaphat Inyawilert', 'Praewa Putticha Boonyamas'], workId: 'love-senior', roles: ['Warang', 'Prang'], source: 'https://glthai.com/love-senior/' },
  { id: 'shumook', names: ['Shu', 'Mook'], members: ['Shu Nunnicha Saehuang', 'Mook Worranit Thawornwong'], workId: 'shades', roles: ['Mink', 'Nalin'], relationship: 'storyline', source: 'https://www.youtube.com/watch?v=K81a_6AJHGI' },
  { id: 'tubtimfilm', names: ['Tubtim', 'Film'], members: ['Tubtim Anyarin Terathananpat', 'Film Cherlisa Seriwiboonkit'], workId: 'mom-ped-sawan', roles: ['หม่อมขำ', 'หม่อมสุด'], relationship: 'pair', source: 'https://www.thaipbs.or.th/program/MhomPedSawan' },
];

export const oct16CpProfiles = oct16PairDefinitions.map(definition => {
  const { id, names, members, workId, source, roles, relationship = 'supporting' } = definition;
  const drama = archive.get(workId);
  const work = oct16Work(workId, source, roles, relationship);
  const shared = relationship === 'supporting' ? '副 CP' : '角色感情线';
  return {
    id, names, aliases: id === 'mewrenee' ? ['MewRenee', 'ReneeMew'] : id === 'shumook' ? ['MookShu'] : [],
    checkedAt: oct16CheckedAt, image: null,
    members: members.map((name, index) => ({ name, nickname: names[index], source, sourceKind: source.includes('gmm-tv.com') ? 'agency' : source.includes('thaipbs.or.th') || source.includes('telasa.co.jp') ? 'publisher' : source.includes('youtube.com') ? 'producer' : 'catalogue', checkedAt: oct16CheckedAt, instagram: null, x: null })),
    works: [work], events: [], shops: [],
    intro: {
      zh: id === 'tubtimfilm' ? 'Tubtim 与 Film 在《深宫幽情》中饰演หม่อมขำ与หม่อมสุด，讲述两位女性在旧时宫廷中的爱情故事。' : `${names.join(' 与 ')} 在《${drama.title}》中演绎${shared}（${roles.join(' / ')}）。这里保留她们的荧幕合作与个人资料。`,
      en: `${names.join(' and ')} play ${roles.join(' and ')} in ${drama.titleEn}. Explore their screen collaboration and sourced personal profiles.`,
      th: `${names.join(' และ ')} รับบท ${roles.join(' และ ')} ใน ${drama.titleEn} หน้านี้รวบรวมผลงานร่วมกันบนจอและข้อมูลส่วนตัวที่มีแหล่งอ้างอิง`,
    },
  };
});

// 已有组合直接补作品，保持 /cp/icemarissa/ 与原演员资料身份键。
export function addOct16SharedWorks(cp) {
  if (cp.id === 'andalookkaew') return {
    ...cp, checkedAt: oct16CheckedAt,
    works: [...cp.works, ...(!cp.works.some(work => work.id === 'khom-khlang') ? [oct16Work('khom-khlang', 'https://wetv.vip/en/play/l8u24vqut3sseql', ['Ratha', 'Lom'])] : [])],
    intro: {
      zh: 'Anda 与 Lookkaew 共同主演《学姐，可以爱我吗》，并在《镇灵》中饰演副 CP Ratha 与 Lom。已官宣项目《Remain》单列于待定作品。',
      en: 'Anda and Lookkaew star in Love Senior and play supporting pair Ratha and Lom in Khom Khlang. Their announced project Remain is listed separately.',
      th: 'Anda และ Lookkaew แสดงนำร่วมกันใน Love Senior และรับบทคู่รอง Ratha กับ Lom ในข่มขลัง ส่วน Remain เป็นโปรเจกต์ที่ประกาศแล้วและแยกแสดงไว้',
    },
  };
  if (cp.id === 'icemarissa') return {
    ...cp, names: ['Ize', 'Marissa'], checkedAt: oct16CheckedAt,
    aliases: [...(cp.aliases || []), 'IceMarissa', 'IzeZa'],
    works: [
      ...['blank', 'blank-season-2'].filter(id => !cp.works.some(work => work.id === id)).map(id => oct16Work(id, 'https://glthai.com/couple/', ['Sam', 'Mon'])),
      ...cp.works,
    ],
    intro: {
      zh: 'Ize 与 Marissa 在《爱填满空白》两季中饰演副 CP Sam 与 Mon，也共同出演《Falling for My Hater》。旧名称 IzeZa 与 IceMarissa 仍可搜索到本档案。',
      en: 'Ize and Marissa play supporting pair Sam and Mon in both seasons of Blank and also appear together in Falling for My Hater. This archive retains the search aliases IzeZa and IceMarissa.',
      th: 'Ize และ Marissa รับบทคู่รอง Sam กับ Mon ใน Blank ทั้งสองซีซัน และร่วมแสดง Falling for My Hater ค้นหาด้วยชื่อเดิม IzeZa หรือ IceMarissa ได้เช่นกัน',
    },
  };
  return cp;
}
