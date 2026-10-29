import { archiveDramas } from '../../data/archive-dramas.js';
import { archiveCharacterCastById } from '../../data/archive-cast.js';

export const shadesCheckedAt = '2026-10-29';
export const shadesSources = {
  teaser: 'https://www.youtube.com/watch?v=NhK6U0NrjD8',
  roles: 'https://entertainment.trueid.net/detail/xAJ1J6NyYe9O',
  relationships: 'https://www.thheadline.com/example-4/46495.html',
  ensemble: 'https://yurithai.jp/dramas/shades',
};

// Public pairing names are corroborated by the producer's own hashtags. They
// establish screen pairings, not private relationships or agency contracts.
export const shadesPairDefinitions = [
  {
    id: 'opalmint', label: 'OpalMint', names: ['Opal', 'Mint'],
    members: ['Opal Kulwipa Ngamsukkasemsri', 'Mint Benjanee Watcharavasoontara'],
    nameSource: 'https://x.com/frt_ent/status/2114703123172163659',
  },
  {
    id: 'puyfaiploy', label: 'PuyfaiPloy', names: ['Puyfai', 'Ploy'],
    members: ['Puyfai Tharathip Baisaeng', 'Ploy Jhutamas Pakonworrawong'],
    nameSource: 'https://x.com/frt_ent/status/2115307107067003217',
  },
  {
    id: 'nikyengland', label: 'NikyEngland', names: ['Niky', 'England'],
    members: ['Niky Warinrat Yolprasong', 'England Ladamanee Rattanapornvareesakul'],
    nameSource: 'https://x.com/frt_ent/status/2115428666519806425',
  },
];

const drama = archiveDramas.find(work => work.id === 'shades');
if (!drama) throw new Error('Missing shared Shades archive');
const castByActor = new Map(archiveCharacterCastById.shades.map(item => [item.actor, item]));

function detailsFor({ names, members }) {
  const cast = members.map(actor => {
    const character = castByActor.get(actor);
    if (!character) throw new Error(`Unverified Shades character: ${actor}`);
    return { ...character };
  });
  const roles = cast.map(item => item.role);
  return {
    work: {
      id: drama.id, title: drama.titleEn, year: drama.year,
      source: shadesSources.relationships, sourceKind: 'media', checkedAt: shadesCheckedAt,
      roles, cast, relationship: 'ensemble', ensemble: true,
    },
    intro: {
      zh: `${names.join(' 与 ')} 在《${drama.title}》中饰演 ${roles.join(' 与 ')}。剧集包含四对相互交织的角色感情线，本页记录她们的荧幕合作与有来源的个人资料。`,
      en: `${names.join(' and ')} play ${roles.join(' and ')} in Shades, an ensemble with four interwoven romantic storylines. This page records their screen collaboration and sourced personal profiles.`,
      th: `${names.join(' และ ')} รับบท ${cast.map(item => item.roleTh).join(' และ ')} ใน Shades ซึ่งเล่าความสัมพันธ์ของตัวละครสี่คู่ หน้านี้รวบรวมผลงานร่วมกันบนจอและข้อมูลส่วนตัวที่มีแหล่งอ้างอิง`,
    },
  };
}

export const shadesCpProfiles = shadesPairDefinitions.map(definition => {
  const { work, intro } = detailsFor(definition);
  return {
    id: definition.id, names: definition.names, image: null, checkedAt: shadesCheckedAt,
    members: definition.members.map((name, index) => ({
      name, nickname: definition.names[index], instagram: null, x: null,
      source: shadesSources.teaser, sourceKind: 'producer', checkedAt: shadesCheckedAt,
    })),
    intro, works: [work], events: [], shops: [],
  };
});

// Keep ShuMook's route, portraits and shared biographies. Sources support four
// interwoven pairings, so do not invent a primary/supporting ranking.
export function completeShadesRelationship(cp) {
  if (cp.id !== 'shumook') return cp;
  const { work, intro } = detailsFor({ names: cp.names, members: cp.members.map(member => member.name) });
  return {
    ...cp, intro, checkedAt: shadesCheckedAt,
    works: cp.works.map(item => item.id === drama.id ? { ...item, ...work } : item),
  };
}
