// Public pairing names are editorial data, not initials generated from actors.
// Keep stable route IDs and actor records independent from display names.
import { workTitleAliases } from '../../i18n/proper-names.js';
const directorySource = 'https://glthai.com/couple/';
const catalogueNames = {
  namtanfilm: 'NamtanFilm', emibonnie: 'EmiBonnie', janjingjing: 'JanJingjing',
  freenbecky: 'FreenBecky', lingorm: 'LingOrm', ginjay: 'GinJay',
  milklove: 'MilkLove', viewmim: 'ViewMim', fayeyoko: 'FayeYoko', faymay: 'FayMay',
  andalookkaew: 'AndaLookkaew', bminenear: 'BMineNear', ormsinfolk: 'OrmFolk',
  christinemae: 'ChristineMae', graceoaey: 'GraceOaey', enjoyjune: 'EnjoyJune',
  applemim: 'AppleMim', namnoey: 'NamneungNoey', lenamiu: 'LenaMiu', oombam: 'OomBam',
  yadatan: 'TanYada', jessietungpang: 'TungpangJessie', bambambaipor: 'BamBamBaipor',
  lillybelle: 'LillyBelle', nattyyeepun: 'NattyYeepun', fayeatom: 'FayeAtom',
  praifahbebell: 'PraifahBebell', myyuchanya: 'MyyuChanya', nilenamwan: 'NileNamwan',
  tknur: 'TKNur', memiice: 'IceMemi', spritepiano: 'SpritePiano', mookpinky: 'MookPink',
  prigkhingthongfah: 'PrigkhingFah', mimiegarn: 'GarnMie', mieaya: 'MieAya',
  ingcartoon: 'IngCartoon', mingmingnepjune: 'MingMingNepjune', bintpuinoon: 'PuinoonBint',
  aomying: 'YingAom', arhoungpamp: 'ArhoungPam', icemarissa: 'IzeMarissa', atommer: 'AtomMer',
};

export const cpNameRecords = Object.fromEntries(Object.entries(catalogueNames).map(([id, label]) => [id, { label, source: directorySource }]));
Object.assign(cpNameRecords, {
  friendpalm: { label: 'FriendPalm', source: 'https://www.youtube.com/watch?v=FoVP2y29_Tk' },
  tanzanook: { label: 'TanZanook', source: 'https://www.youtube.com/watch?v=AWnUGoONk_o' },
  ferinpuifai: { label: 'Ferin · Puifai', source: 'https://www.youtube.com/watch?v=WR-HPcdHxlQ' },
  pimjipineare: { label: 'Pimji · Pineare', source: 'https://x.com/wabisabiTH/status/2102725466373464369' },
  engfacharlotte: { label: 'EngLot', source: 'https://missgrand.com/wp-content/uploads/2024/03/MGI-OppDay-Y2023.pdf' },
  lookmheesonya: { label: 'LMSY', source: 'https://www.thaiticketmajor.com/performance/lmsy-1st-fan-meeting-in-thailand-be-my-valentine.html' },
  mablepangjie: { label: 'BleJie', source: 'https://mablesiriwalee.com/en/works' },
  aoommeena: { label: 'MeenBabe', source: 'https://meenbabe.com/underherrulestheseries' },
  janekao: { label: 'JaneKao', aliases: ['KaoJane', 'KaoJaneJaneKao', '9779'], source: 'https://www.sina.cn/media/7846883538' },
  nattpitcha: { label: 'NattPitcha', aliases: ['NattPitchat'], source: 'https://yurithai.jp/cast' },
  yoshidiana: { label: 'DianaYoshi', source: 'https://www.herinfocus.com/coming-soon' },
  tinanana: { label: 'TinaNana', source: 'https://tellasgllist.neocities.org/T' },
  icemarissa: { label: 'IzeZa', aliases: ['IzeMarissa'], source: 'https://www.sotwe.com/gigimsl_?lang=en' },
});

// Pair labels must have their own evidence; cast order does not define a ship name.
Object.assign(cpNameRecords, {
  kapookciize: { label: 'KapookCiize', source: 'https://www.gmm-tv.com/contents/VLbpx/' },
  faygene: { label: 'FayGene', source: directorySource },
  giftaomsin: { label: 'GiftAomsin', aliases: ['AomsinGift'], source: directorySource },
  linnpraew: { label: 'LinnPraew', aliases: ['PraewLinn'], source: directorySource },
  ploypunch: { label: 'PloyPunch', source: directorySource },
  tiankitty: { label: 'TianKitty', aliases: ['KittyTian'], source: 'https://thaiglweekly.com/' },
  musicplaifah: { label: 'PlaifahMiusic', aliases: ['MusicPlaifah', 'MiusicPlaifah'], source: 'https://feedforfuture.co/feed-ent/74018/' },
  aomshelly: { label: 'ShellyPundao', aliases: ['AomShelly', 'PundaoShelly'], source: 'https://x.com/MotionMindsEntt/status/2105628905092915400' },
  bminemekkhala: { label: 'B Mine · Mekkhala', source: 'https://www.boyslovetalk.com/p/serie-gl-music-story-losing-control' },
  bminemashii: { label: 'B Mine · Mashii', source: 'https://www.boyslovetalk.com/p/serie-gl-music-story-losing-control' },
});

export function cpLabel(cp) { return cpNameRecords[cp.id]?.label || cp.names.join(' · '); }

export function filterCps(profiles, query, archiveById) {
  const normalize = value => value.toLowerCase().replace(/[\s·&._-]+/g, '');
  const needle = normalize(query.trim());
  return profiles.filter(cp => [cpLabel(cp), cp.names.join(''), cp.names.slice().reverse().join(''),
    ...(cp.aliases || []), ...(cpNameRecords[cp.id]?.aliases || []), ...cp.members.map(member => member.name),
    ...[...cp.works, ...(cp.upcoming || [])].flatMap(work => [work.title, ...(work.cast || []).map(person => `${person.actor} ${person.role}`), archiveById.get(work.id)?.title || '', ...(archiveById.get(work.id)?.aliases || []), ...workTitleAliases(work)]),
  ].some(value => normalize(value).includes(needle)));
}
