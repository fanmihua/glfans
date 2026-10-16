// 同一演员供不同组合复用。资料站字段保留 catalogue 等级；
// 未确认及互相冲突的生日、身高、账号保留空值。
const checkedAt = '2026-10-16';
const catalogue = (id, fullName, source, instagram, rest = {}) => ({ id, fullName, source, instagram, x: null, birthday: null, heightCm: null, sourceKind: 'catalogue', checkedAt, ...rest });
export const oct16ActorProfiles = {
  'Mew Thanthip Thaweesinthanat': catalogue('mew-thanthip', 'Thanthip Thaweesinthanat', 'https://glthai.com/couple/', 'khunmewwww', { x: 'khunmewwww' }),
  'Renée Veronica Pagano': catalogue('renee-veronica', 'Veronica Pagano', 'https://glthai.com/couple/', 'reneeveronicaa', { x: 'reneeveronicaa' }),
  'June Wanwimol Jaenasavamethee': catalogue('june-wanwimol', 'Wanwimol Jaenasavamethee', 'https://www.gmm-tv.com/artists/view/60/', 'junewanwimol19', { sourceKind: 'agency', birthday: '2000-04-19', heightCm: 162, x: 'junewanwimol19' }),
  'Mewnich Nannaphas Loetnamchoetsakun': catalogue('mewnich', 'Nannaphas Loetnamchoetsakun', 'https://www.gmm-tv.com/artists/view/84/', 'mewnich.nannaphas', { sourceKind: 'agency', birthday: '2002-03-11', heightCm: 160, x: 'mewnich__' }),
  'Noon Thunyaphat Inyawilert': catalogue('noon-thunyaphat', 'Thunyaphat Inyawilert', 'https://kprofiles.com/hi-u-member-profile/', 'noonntyp', { birthday: '2001-01-08', heightCm: 173, additionalReferences: [{ url: 'https://www.iq.com/actor-info/thunyaphat-inyawilert-8821919180922905?lang=en_us', kind: 'producer' }] }),
  'Praewa Putticha Boonyamas': catalogue('praewa-putticha', 'Putticha Boonyamas', 'https://yurithai.jp/dramas/hidden-heart', 'praewa.era', { birthday: '2003-01-24', additionalReferences: [{ url: 'https://www.iq.com/actor-info/putticha-boonyamas-5602827634102905?lang=en_us', kind: 'producer' }] }),
  'Shu Nunnicha Saehuang': catalogue('shu-nunnicha', 'Nunnicha Saehuang', 'https://www.thaicontentdb.com/persons/cmes76a2b1cewwutsm3kibgwr', 'shuu.nc'),
  'Mook Worranit Thawornwong': catalogue('mook-worranit', 'Worranit Thawornwong', 'https://www.thaicontentdb.com/en/persons/cmes6edn70z7nwutsqaxxg02d', 'mookworranit', { birthday: '1996-10-09', heightCm: 170 }),
  'Tubtim Anyarin Terathananpat': catalogue('tubtim-anyarin', 'Anyarin Terathananpat', 'https://www.thaicontentdb.com/en/persons/cmes5sp1c0oszwutsgb310kwi', 'anyarinsweet', { birthday: '1990-10-21', additionalReferences: [{ url: 'https://www.thaipbs.or.th/program/ArtandCultureThaiPBS/episodes/105092', kind: 'producer' }] }),
  'Film Cherlisa Seriwiboonkit': catalogue('film-cherlisa', 'Cherlisa Seriwiboonkit', 'https://www.thaicontentdb.com/persons/cmes5u8tr0pk2wutsf4a9oidk', 'film_chatdao', { birthday: '1992-12-05', heightCm: 166, additionalReferences: [{ url: 'https://www.thaipbs.or.th/now/content/563820', kind: 'producer' }] }),
};
