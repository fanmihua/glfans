// Public pairing names are editorial data, not initials generated from actors.
// Keep stable route IDs and actor records independent from display names.
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

export function cpLabel(cp) { return cpNameRecords[cp.id]?.label || cp.names.join(' · '); }

export function filterCps(profiles, query, archiveById) {
  const normalize = value => value.toLowerCase().replace(/[\s·&._-]+/g, '');
  const needle = normalize(query.trim());
  return profiles.filter(cp => [cpLabel(cp), cp.names.join(''), cp.names.slice().reverse().join(''),
    ...(cp.aliases || []), ...(cpNameRecords[cp.id]?.aliases || []), ...cp.members.map(member => member.name),
    ...[...cp.works, ...(cp.upcoming || [])].flatMap(work => [work.title, archiveById.get(work.id)?.title || '']),
  ].some(value => normalize(value).includes(needle)));
}
