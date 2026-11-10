// Official project sources reviewed on 2026-09-30. These announcements have no
// confirmed airing date; publication dates are not used as calendar dates.
const preview = (id, title, videoId, publisher) => ({
  id, title, publisher, checkedAt: '2026-09-30',
  source: `https://www.youtube.com/watch?v=${videoId}`,
  image: `assets/cp/${id}-official-preview.webp`,
  imageSource: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  width: 1280, height: 720, focus: '50% 50%',
});
const announcement = (id, title, source, publisher, checkedAt = '2026-09-30') => ({
  id, title, source, publisher, sourceKind: 'announcement', checkedAt,
});

export const cpProjectUpdates = {
  applemim: [announcement('sweet-bond', 'Sweet Bond', 'https://x.com/AppleLAPIS/status/2118411862828335186', 'Apple Lapisara', '2026-11-10')],
  fayeatom: [{
    ...announcement('love-in-the-fast-lane', 'Love in the Fast Lane', 'https://x.com/iQIYI_Thailand/status/2118317276843905195', 'iQIYI Thailand', '2026-11-10'),
    imageKind: 'poster', imageFit: 'contain',
    image: 'assets/cp/love-in-the-fast-lane.webp', imageSource: 'https://pbs.twimg.com/media/HWXGVWKbEAAz40A.jpg?name=orig',
    width: 900, height: 1125, focus: '50% 35%',
  }],
  milklove: [preview('ditto', 'Ditto', '30LfbsWHCW4', 'GMMTV OFFICIAL')],
  viewmim: [preview('bake-love-feeling', 'Bake Love Feeling', 'NFFWV0X4i_c', 'GMMTV OFFICIAL')],
  andalookkaew: [preview('remain', 'Remain', 'jAQ-I2HmJ8I', 'Star Hunter Entertainment')],
  tknur: [preview('dangerous-queen-special', 'Dangerous Queen: Special Edition', 'mML5eJ5o1PE', 'Snur Entertainment')],
  jessietungpang: [announcement('love-in-bloom', 'Love In Bloom', 'https://x.com/LoveInBloomMono/status/2099514391507153367', 'MONO Original')],
  janjingjing: [{
    ...announcement('married-to-my-enemy', 'Married to My Enemy', 'https://x.com/iQIYI_Thailand/status/2118308858385113110', 'iQIYI Thailand', '2026-11-10'),
    imageKind: 'poster', imageFit: 'contain',
    image: 'assets/cp/married-to-my-enemy.webp', imageSource: 'https://pbs.twimg.com/media/HWW8mf8bMAI1sVv.jpg?name=orig',
    width: 900, height: 1120, focus: '50% 35%',
  }],
  friendpalm: [preview('resonance', 'Resonance', 'FoVP2y29_Tk', 'VelCurve Studio Official')],
  tanzanook: [preview('yes-maybe-no', 'YES maybe NO', 'AWnUGoONk_o', "Kongthup’s Channel")],
};
