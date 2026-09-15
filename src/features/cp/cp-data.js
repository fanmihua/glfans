// Sources were reviewed on 2026-09-10. An empty list means no verified entry,
// not that the artist has no events or brands. Never infer current stock.
import { expandedCpProfiles } from './cp-expanded-data.js';
import { enrichMember } from './member-profiles.js';
export const verifiedAt = '2026-09-10';
const gm = (id) => `https://www.gmm-tv.com/artists/view/${id}/`;
const person = (name, instagram, x, source) => ({ name, instagram, x, source });
const work = (id, title, year, source, ensemble = false) => ({ id, title, year, source, ensemble });
const shop = { title: 'GMMTV SHOP', kind: 'officialShop', url: 'https://shop.gmm-tv.com/', source: 'https://shop.gmm-tv.com/' };
const preview = (id, title, videoId, publisher, status) => ({ id, title, status, source: `https://www.youtube.com/watch?v=${videoId}`, image: `assets/cp/${id}-official-preview-hd.jpg`, imageSource: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, publisher, width: 1280, height: 720, focus: id === 'cranium' ? '15% 50%' : '22% 50%' });

export const cpProfiles = [
  {
    id: 'namtanfilm', names: ['Namtan', 'Film'], image: 'assets/home/namtanfilm-card-v1.webp',
    members: [person('Namtan Tipnaree', 'namtan.tipnaree', 'NamtanTipnaree', gm(94)), person('Film Rachanun', 'fr.racha', 'filmracha', gm(31))],
    intro: {
      zh: 'Namtan 与 Film 共同主演《Pluto》，并在群像作品《Girl Rules》中继续合作。从角色出发，认识镜头前的她们。',
      en: 'Namtan and Film star together in Pluto and reunite in the ensemble series Girl Rules. Get to know them through their work.',
      th: 'Namtan และ Film แสดงนำร่วมกันใน Pluto และร่วมงานกันอีกครั้งในซีรีส์ที่มีนักแสดงนำหลายคู่ Girl Rules มารู้จักทั้งคู่ผ่านผลงานของพวกเธอ',
    },
    works: [work('pluto', 'Pluto', '2024', 'https://www.gmm-tv.com/contents/VgvZZ/'), work('girl-rules', 'Girl Rules', '2026', 'https://www.gmm-tv.com/news/4148/', true)],
    upcoming: [preview('her', 'Her', 'OXfExloO350', 'GMMTV')],
    events: [{ title: 'NAMTAN FILM GLAMOROUS FANCON', kind: 'announcement', source: 'https://weibo.com/2/detail/5338388913456576', publisher: 'GMMTV' }],
    shops: [shop],
  },
  {
    id: 'emibonnie', names: ['Emi', 'Bonnie'], image: 'assets/home/emibonnie-card-v1.webp',
    members: [person('Emi Thasorn', 'emiamily', 'emiamily', gm(29)), person('Bonnie Pattraphus', 'beonnnie', 'beonnnie', gm(14))],
    intro: {
      zh: 'Emi 与 Bonnie 的共同作品包括《Us》和《Moonshadow》。她们也以 RISER MUSIC 双人组合身份，把合作延伸到音乐舞台。',
      en: 'Emi and Bonnie share the screen in Us and Moonshadow. As a RISER MUSIC duo, their collaboration also reaches the music stage.',
      th: 'Emi และ Bonnie มีผลงานร่วมกันใน Us และ Moonshadow และยังเป็นศิลปินดูโอ้ของ RISER MUSIC ที่ร่วมงานกันบนเวทีดนตรีด้วย',
    },
    works: [work('us', 'Us', '2025', 'https://www.gmm-tv.com/contents/VL0jE/'), work('moonshadow', 'Moonshadow', '2026', 'https://www.gmm-tv.com/contents/episode/2eOWQ/?v=40DlJ')],
    events: [{ title: 'EMI BONNIE : LOVE SESSION', kind: 'recap', date: '2026.03.07–08', source: 'https://www.gmm-tv.com/news/4170/', publisher: 'GMMTV', image: 'assets/cp/emibonnie-love-session.jpg', imageSource: 'https://www.gmm-tv.com/cms/upload_file/news/pic/480x360/1b85445ed450075359742262d5100041.jpg' }],
    shops: [shop],
  },
  {
    id: 'janjingjing', names: ['Jan', 'JingJing'], image: 'assets/home/janjingjing-card-v1.webp',
    members: [person('Jan Ployshompoo', 'janhae', 'janhae', gm(51)), person('JingJing Prariyapit', 'jingjingyu36', 'Jingjingyu364', gm(56))],
    intro: {
      zh: 'Jan 与 JingJing 在《Enemies With Benefits》中饰演 Lal 与 Wine，从办公室里的针锋相对，展开一段共同的荧幕故事。',
      en: 'Jan and JingJing play Lal and Wine in Enemies With Benefits, a shared screen story that begins with rivalry in the office.',
      th: 'Jan และ JingJing รับบทลัลล์และไวน์ใน Enemies With Benefits เรื่องราวความสัมพันธ์บนจอที่เริ่มต้นจากการเป็นคู่แข่งในออฟฟิศ',
    },
    works: [
      work('enemies-with-benefits', 'Enemies With Benefits', '2026', 'https://www.gmm-tv.com/news/4214/'),
      work('muteluv-hello-is-this-luck', 'MuTeLuv: Hello, Is This Luck?', '2025', 'https://glspotlight.com/series/muteluv'),
    ],
    events: [], shops: [shop],
  },
  {
    id: 'freenbecky', names: ['Freen', 'Becky'], image: 'assets/home/freenbecky-card-v1.webp',
    members: [person('Freen Sarocha', 'srchafreen', 'srchafreen', 'https://linktr.ee/srchafreen'), person('Becky Rebecca', 'beccca', null, 'https://linktr.ee/23rdREBECCA')],
    intro: {
      zh: '从《GAP》到《The Loyal Pin》，Freen 与 Becky 在不同年代与角色中共同讲述爱情故事。这一页收录她们已核实的共同作品与个人入口。',
      en: 'From GAP to The Loyal Pin, Freen and Becky tell love stories across different eras and roles. Explore their verified shared works and personal links.',
      th: 'จาก GAP ถึง The Loyal Pin Freen และ Becky ถ่ายทอดเรื่องราวความรักผ่านยุคสมัยและบทบาทที่ต่างกัน สำรวจผลงานร่วมกันและช่องทางส่วนตัวของทั้งคู่ได้ที่นี่',
    },
    works: [work('gap', 'GAP', '2022', 'https://workpointworldwide.com/project/gap-the-series/'), work('the-loyal-pin', 'The Loyal Pin', '2024', 'https://workpointworldwide.com/project/the-loyal-pin/'), work('the-air', 'The Air', '2026', 'https://glspotlight.com/series/the-air')],
    upcoming: [preview('cranium', 'Cranium', 'lgbQKzoliY4', 'IDOLFACTORY', 'announcedProject')],
    events: [], shops: [],
  },
  {
    id: 'lingorm', names: ['Ling', 'Orm'], image: 'assets/home/lingorm-card-v1.webp',
    members: [person('Lingling Kwong', 'linglingkwong', 'linglingsirilak', 'https://linktr.ee/linglingkwong'), person('Orm Kornnaphat', 'orm.kornnaphat', 'ormmormm', 'https://linktr.ee/ormkornnaphat')],
    intro: {
      zh: 'Lingling 与 Orm 共同主演《The Secret of Us》和《Only You》。从荧幕作品认识她们，也可以顺着各自的官方账号继续关注。',
      en: 'Lingling and Orm star together in The Secret of Us and Only You. Discover their work and keep up with each artist through her official accounts.',
      th: 'Lingling และ Orm แสดงนำร่วมกันใน The Secret of Us และ Only You รู้จักทั้งคู่ผ่านผลงานและติดตามต่อได้ทางบัญชีทางการของแต่ละคน',
    },
    works: [work('the-secret-of-us', 'The Secret of Us', '2024', 'https://www.becworld.com/en/our-pride/891/ling-orm-receive-three-y-entertain-awards-2024'), work('only-you', 'Only You', '2025', 'https://www.becworld.com/en/our-pride/899/bec-reveals-2025-drama-series-lineup'), work('in-love-forever', 'In Love Forever', '2026', 'https://glspotlight.com/series/in-love-forever')],
    events: [],
    shops: [{ title: 'KEEP:SILENT', kind: 'memberLink', owner: 'Orm', url: 'https://www.keepsilentshhh.com/en', source: 'https://linktr.ee/ormkornnaphat' }],
  },
  {
    id: 'janekao', names: ['Jane', 'Kao'], image: 'assets/home/janekao-card-v1.webp',
    members: [person('Jane Methika', 'janeeyeh', null, 'https://www.linkedin.com/company/velcurve-studio'), person('Kao Supassara', 'supassra_sp', null, 'https://www.linkedin.com/company/velcurve-studio')],
    intro: { zh: 'Jane 与 Kao 在《Love Design》中共同主演，围绕建筑设计与职场竞争展开一段爱情故事。', en: 'Jane and Kao star together in Love Design, a romance set in the world of architecture and workplace rivalry.', th: 'Jane และ Kao แสดงนำร่วมกันใน Love Design เรื่องราวความรักในโลกของงานสถาปัตยกรรมและการแข่งขันในที่ทำงาน' },
    works: [work('love-design', 'Love Design', '2025', 'https://www.linkedin.com/company/velcurve-studio')],
    events: [], shops: [],
  },
  {
    id: 'ginjay', names: ['Gin', 'Jay'], image: 'assets/home/ginjay-card-v1.webp',
    members: [person('Ginny Natnicha', 'ginnynatnicha', 'ginnynatnicha', 'https://x.com/ginnynatnicha'), person('Jayna Angelina', 'aangelinaa.ss', 'j_jayyna', 'https://x.com/j_jayyna')],
    intro: { zh: 'Ginny 与 Jayna 共同主演《Poisonous Love》，并在已官宣的《Lunar Secret》中再次合作。', en: 'Ginny and Jayna star together in Poisonous Love and reunite in the announced project Lunar Secret.', th: 'Ginny และ Jayna แสดงนำร่วมกันใน Poisonous Love และกลับมาร่วมงานกันในโปรเจกต์ Lunar Secret ที่ประกาศแล้ว' },
    works: [work('poisonous-love', 'Poisonous Love', '2025', 'https://glspotlight.com/series/poisonous-love')],
    upcoming: [preview('lunar-secret', 'Lunar Secret', 'TDY-ZwAtCPI', 'NORTH STAR ENTERTAINMENT')],
    events: [], shops: [],
  },
  ...expandedCpProfiles,
].map(cp => ({ ...cp, members: cp.members.map(enrichMember) }));

export function findCp(id) { return cpProfiles.find((cp) => cp.id === id); }
export function cpsForWork(id) { return cpProfiles.filter(cp => cp.works.some(work => work.id === id)); }
