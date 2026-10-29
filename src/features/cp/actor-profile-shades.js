import { shadesSources, shadesCheckedAt } from './cp-shades-data.js';

// English names keep the existing archive spellings, checked against individual
// ThaiContentDB records. The broadcaster's cast guide verifies roles and IG.
// Birthdays, heights, X and Weibo have not been sufficiently corroborated here.
const actor = (id, fullName, instagram, catalogueId) => ({
  id, fullName, instagram, birthday: null, heightCm: null, x: null,
  source: `https://thaicontentdb.com/en/persons/${catalogueId}`,
  sourceKind: 'catalogue', checkedAt: shadesCheckedAt,
  additionalReferences: [
    { url: shadesSources.roles, kind: 'publisher' },
    { url: shadesSources.teaser, kind: 'producer' },
  ],
});

export const shadesActorProfiles = {
  'Opal Kulwipa Ngamsukkasemsri': actor('opal-kulwipa', 'Kulwipa Ngamsukkasemsri', 'thepigwipa', 'cmf8q54ve005l4e0rs5jpm9e5'),
  'Mint Benjanee Watcharavasoontara': actor('mint-benjanee', 'Benjanee Watcharavasoontara', 'mmint.w', 'cmes7m76c1jy5wuts39favs99'),
  'Puyfai Tharathip Baisaeng': actor('puyfai-tharathip', 'Tharathip Baisaeng', 'puyy_faii', 'cmj4cqwbm00281u0slyg5c2ay'),
  'Ploy Jhutamas Pakonworrawong': actor('ploy-jhutamas', 'Jhutamas Pakonworrawong', 'jhutaa', 'cmj4c48gx001a1u0she8v8m2x'),
  'Niky Warinrat Yolprasong': actor('niky-warinrat', 'Warinrat Yolprasong', 'youknowinever_', 'cmes6r2b6158wwutsyl2otl4k'),
  'England Ladamanee Rattanapornvareesakul': actor('england-ladamanee', 'Ladamanee Rattanapornvareesakul', 'eng_lr39', 'cmj4c9s5m0001wujpxreur46k'),
};
