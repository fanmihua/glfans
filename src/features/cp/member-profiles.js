import { actorProfiles } from './actor-profiles.js';
import { actorWeibo, actorXUpdates, socialNeedsReview } from './actor-socials.js';

// Public biographical facts, checked 2026-09-10. Do not infer private details.
const gm = id => `https://www.gmm-tv.com/artists/view/${id}/`;
const profile = (fullName, birthday, source) => ({ fullName, birthday, source });
export const memberProfiles = {
  'namtan.tipnaree': profile('Tipnaree Weerawatnodom', '1996-07-01', gm(94)),
  'fr.racha': profile('Rachanun Mahawan', '2000-07-14', gm(31)),
  emiamily: profile('Thasorn Klinnium', '1998-04-25', gm(29)),
  beonnnie: profile('Pattraphus Borattasuwan', '2004-01-27', gm(14)),
  janhae: profile('Ployshompoo Supasap', '1995-01-05', gm(51)),
  jingjingyu36: profile('Prariyapit Yu', '1997-04-01', gm(56)),
  srchafreen: profile('Sarocha Chankimha', '1998-08-08', 'https://entertainment.trueid.net/detail/26ap3Kedmd2k'),
  beccca: profile('Rebecca Patricia Armstrong', '2002-12-05', 'https://www.pptvhd36.com/news/ข่าวบันเทิง/266047'),
  linglingkwong: profile('Sirilak Kwong', '1995-05-11', 'https://www.thairath.co.th/entertain/news/1991048'),
  'orm.kornnaphat': profile('Kornnaphat Sethratanapong', '2002-05-27', 'https://entertainment.trueid.net/detail/b8x94kqQ3dOP'),
  janeeyeh: profile('Methika Jiranorraphat', '1999-06-19', 'https://entertainment.trueid.net/detail/XeDNLMnGx3bm'),
  supassra_sp: profile('Supassara Thanachat', '1995-04-29', 'https://entertainment.trueid.net/detail/OBKg9OmL50qB'),
  ginnynatnicha: profile('Natnicha Pratipnatsiri', '2000-12-17', 'https://www.khaosod.co.th/entertainment/news_10363265'),
  'aangelinaa.ss': profile('Angelina Stevens', '2006-02-17', 'https://agenciaorbita.org/ginny-jayna-the-tempting-venom-tour-las-celebridades-llegan-por-primera-vez-a-lima/'),
};

const agencyProfiles = {
  loverrukk: { ...profile('Pattranite Limpatiyakorn', '2000-05-23', gm(76)), heightCm: 156 },
  'view.benyapa': { ...profile('Benyapa Jeenprasom', '2002-06-04', gm(153)), heightCm: 172 },
  'mim.rattanawadee': { ...profile('Rattanawadee Wongthong', '2004-05-22', gm(88)), heightCm: 160 },
};
const artistProfiles = {
  mimiebhapat: { birthdayMonthDay: '04-03', source: 'https://x.com/mimieahc' },
};

export function profileForMember(member) {
  const catalogue = actorProfiles[member.name];
  const instagram = member.instagram || catalogue?.instagram || null;
  const original = memberProfiles[instagram];
  const agency = agencyProfiles[instagram];
  const artist = artistProfiles[instagram];
  const xUpdate = actorXUpdates[instagram];
  const xConflict = socialNeedsReview.some(item => item.instagram === instagram && item.platform === 'x');
  const weibo = actorWeibo[instagram] || null;
  const references = [
    catalogue && { url: catalogue.source, kind: 'catalogue' },
    original && { url: original.source, kind: original.source.includes('gmm-tv.com') ? 'agency' : 'media' },
    agency && { url: agency.source, kind: 'agency' },
    artist && { url: artist.source, kind: 'artist' },
    xUpdate && { url: xUpdate.source, kind: xUpdate.sourceKind },
    weibo && { url: weibo.source, kind: weibo.sourceKind },
  ].filter(Boolean);
  return {
    ...catalogue, ...original, ...agency, ...artist,
    fullName: agency?.fullName || original?.fullName || catalogue?.fullName || member.name,
    birthday: agency?.birthday || original?.birthday || catalogue?.birthday || null,
    // Different sources list different heights for Mook; don't silently choose one.
    heightCm: instagram === '_mookynapapach' ? null : (agency?.heightCm || catalogue?.heightCm || null),
    instagram,
    x: xConflict ? null : (xUpdate?.handle || member.x || catalogue?.x || null),
    weibo,
    references: references.filter((item, index) => references.findIndex(other => other.url === item.url) === index),
    checkedAt: catalogue?.checkedAt || '2026-09-10',
  };
}

export function enrichMember(member) {
  const { instagram, x, weibo } = profileForMember(member);
  return { ...member, instagram, x, weibo };
}

// Common Western tropical date ranges, not a birth-chart calculation.
const zodiacStarts = [[120,'aquarius'],[219,'pisces'],[321,'aries'],[420,'taurus'],[521,'gemini'],[621,'cancer'],[723,'leo'],[823,'virgo'],[923,'libra'],[1023,'scorpio'],[1122,'sagittarius'],[1222,'capricorn']];
export function zodiacForBirthday(birthday) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday || '')) return null;
  const date = new Date(`${birthday}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== birthday) return null;
  const value = Number(birthday.slice(5,7)) * 100 + Number(birthday.slice(8,10));
  let sign = 'capricorn';
  for (const [start, name] of zodiacStarts) if (value >= start) sign = name;
  return sign;
}

export const zodiacLabels = {
  zh: { aries:'白羊座', taurus:'金牛座', gemini:'双子座', cancer:'巨蟹座', leo:'狮子座', virgo:'处女座', libra:'天秤座', scorpio:'天蝎座', sagittarius:'射手座', capricorn:'摩羯座', aquarius:'水瓶座', pisces:'双鱼座' },
  en: { aries:'Aries', taurus:'Taurus', gemini:'Gemini', cancer:'Cancer', leo:'Leo', virgo:'Virgo', libra:'Libra', scorpio:'Scorpio', sagittarius:'Sagittarius', capricorn:'Capricorn', aquarius:'Aquarius', pisces:'Pisces' },
  th: { aries:'เมษ', taurus:'พฤษภ', gemini:'เมถุน', cancer:'กรกฎ', leo:'สิงห์', virgo:'กันย์', libra:'ตุลย์', scorpio:'พิจิก', sagittarius:'ธนู', capricorn:'มังกร', aquarius:'กุมภ์', pisces:'มีน' },
};
