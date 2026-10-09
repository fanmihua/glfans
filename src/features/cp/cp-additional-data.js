import { archiveDramas } from '../../data/archive-dramas.js';

// 人工核对的角色关系；不从主演名单生成组合，也不推断当前经纪合作。
// 新演员只收录本轮有出处的姓名，生日、身高、社交账号保留待核实。
export const additionsCheckedAt = '2026-10-09';
const archive = new Map(archiveDramas.map(work => [work.id, work]));
const sources = {
  kapookciize: 'https://www.gmm-tv.com/news/4214/',
  chasing: 'https://entertainment.trueid.net/detail/YqAEz2O2E57q',
  linnpraew: 'https://thaiglhub.com/artist-profiles/praewcherr/',
  friendpalm: 'https://en.wikipedia.org/wiki/Love_Design',
  mission: 'https://www.youtube.com/watch?v=LpARdEpqwF8',
  runaway: 'https://www.telasa.co.jp/news/最新タイドラマ-telasa（テラサ）独占配信-タイで大人気/',
  roller: 'https://girlslove.org/series/roller-coaster',
  losing: 'https://www.boyslovetalk.com/p/serie-gl-music-story-losing-control',
  moonshadow: 'https://www.mintmagth.com/story/namtan-moonshadow-ep6',
  harmony: 'https://www.imdb.com/title/tt37702242/',
};

export function sourcedWork(id, source, relationship = 'supporting', roles = []) {
  const drama = archive.get(id);
  if (!drama) throw new Error(`Unknown shared work: ${id}`);
  return { id, title: drama.titleEn, year: drama.year, source, relationship, roles, checkedAt: additionsCheckedAt };
}

const definitions = [
  ['kapookciize', ['Kapook', 'Ciize'], ['Kapook Ploynira Hiruntaveesin', 'Ciize Rutricha Phapakithi'], 'enemies-with-benefits', sources.kapookciize, 'supporting', ['Tangkwa', 'Proud'], ['卡冰']],
  ['faygene', ['Fay', 'Gene'], ['Fay Apisara Lertwisettheerakul', 'Gene Ornalin Leelaburanathanakul'], 'chasing-love', sources.chasing, 'supporting', ['Ploy', 'Ple']],
  ['giftaomsin', ['Gift', 'Aomsin'], ['Gift Sirinart Sugandharat', 'Aomsin Nuttharat Papirom'], 'chasing-love', sources.chasing, 'supporting', ['Matmi', 'Rin']],
  ['linnpraew', ['Linn', 'Praew'], ['Linn Mashannoad Suvanamas', 'Praew Chermawee Suwanpanuchoke'], 'queendom', sources.linnpraew, 'supporting', ['Wanmai', 'Saifon']],
  ['friendpalm', ['Friend', 'Palm'], ['Friend Torfan Taweema', 'Palm Paramee Luengnaruemitchai'], 'love-design', sources.friendpalm, 'supporting', ['Vee', 'Tertis'], ['Tetris', '设计爱情']],
  ['ploypunch', ['Ploy', 'Punch'], ['Ploy Peerachada Khunrak', 'Punch Naphassanan Kalaphan'], 'mission-love-or-lies', sources.mission, 'pair', ['Achi', 'Patty']],
  ['tiankitty', ['Tian', 'Kitty'], ['Tian Atcharee Buakhiao', 'Kitty Nunthaphuk Aranyakasemsuk'], 'mission-love-or-lies', sources.mission, 'supporting', []],
  ['musicplaifah', ['Music', 'Plaifah'], ['Music Praewa Suthamphong', 'Plaifah Chaiyapat Jampasin'], 'runaway', sources.runaway, 'pair', ['Win', 'Boon'], ['Miusic', 'Plaifah Siraacha']],
  ['aomshelly', ['Aom', 'Shelly'], ['Aom Pundao Panyabaramee', 'Shelly Phetsai Chanrueang'], 'roller-coaster', sources.roller, 'pair', ['Pure', 'Loft']],
  ['bminemekkhala', ['B Mine', 'Mekkhala'], ['B Mine Jiratchaya Komontut', 'Mekkhala Naruthai Chatupharungroj'], 'music-story-losing-control', sources.losing, 'storyline', ['Queen', 'Sea']],
  ['bminemashii', ['B Mine', 'Mashii'], ['B Mine Jiratchaya Komontut', 'Mashii Pornthiphat Lertwuthanon'], 'music-story-losing-control', sources.losing, 'storyline', ['Queen', 'Bam'], ['Mashi']],
];

export const additionalCpProfiles = definitions.map(([id, names, fullNames, workId, source, relationship, roles, aliases = []]) => {
  const work = sourcedWork(workId, source, relationship, roles);
  const drama = archive.get(workId);
  const roleText = roles.length ? `（${roles.join(' / ')}）` : '';
  return {
    id, names, aliases, checkedAt: additionsCheckedAt, image: null,
    members: fullNames.map((name, index) => ({ name, fullName: name.slice(names[index].length).trim(), nickname: names[index], source, sourceKind: source.includes('gmm-tv.com') ? 'agency' : source.includes('telasa.co.jp') ? 'publisher' : 'catalogue', checkedAt: additionsCheckedAt, instagram: null, x: null })),
    works: [work], events: [], shops: [],
    intro: {
      zh: `${names.join(' 与 ')} 在《${drama.title}》中演绎${relationship === 'supporting' ? '副 CP' : relationship === 'storyline' ? '角色感情线' : '双人主线'}${roleText}。本页记录这段荧幕合作。`,
      en: `${names.join(' and ')} share ${relationship === 'supporting' ? 'a supporting romance' : 'a romantic storyline'} in ${work.title}${roles.length ? ` as ${roles.join(' and ')}` : ''}. This page records their screen collaboration.`,
      th: `${names.join(' และ ')} แสดง${relationship === 'supporting' ? 'เป็นคู่รอง' : 'ในเรื่องราวความรัก'}ใน ${work.title}${roles.length ? ` ในบท ${roles.join(' และ ')}` : ''} หน้านี้บันทึกการร่วมงานบนจอ`,
    },
  };
});

// 已有组合补作品，不重复建档；保留原人物记录。
export function addSharedWorks(cp) {
  const additions = cp.id === 'namtanfilm' ? [sourcedWork('moonshadow', sources.moonshadow)]
    : cp.id === 'lillybelle' ? [sourcedWork('harmony-secret', sources.harmony, 'supporting', ['G', 'Jam'])] : [];
  return additions.length ? { ...cp, checkedAt: additionsCheckedAt, aliases: [...(cp.aliases || []), ...(cp.id === 'namtanfilm' ? ['糖影'] : [])], works: [...cp.works, ...additions.filter(work => !cp.works.some(existing => existing.id === work.id))] } : cp;
}
