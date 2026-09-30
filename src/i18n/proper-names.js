// Names are identifiers, not prose. Unverified names keep their source spelling.
export const verifiedSeries = [
  { aliases: ["Don't say ‘NO’ yet"], en: "Don't say ‘NO’ yet", th: "อย่าพึ่งตอบว่า'ไม่'", source: 'https://www.youtube.com/watch?v=WR-HPcdHxlQ' },
  { aliases: ['Built in Love'], en: 'Built in Love', th: 'ก่อร่างสร้างเลิฟ', source: 'https://www.youtube.com/watch?v=3fOkgCnjv5M' },
  { aliases: ['Love On Hire'], en: 'Love On Hire', th: 'รับจ้างเลิกรัก', source: 'https://www.youtube.com/watch?v=F1l1mAvSmZo' },
  { aliases: ['宿敌恋人'], en: 'Enemies With Benefits', th: 'ลัลล์ไม่ชอบไวน์', source: 'https://www.gmm-tv.com/news/4214/' },
  { aliases: ['我们的爱'], en: 'Us', th: 'Us รักของเรา', source: 'https://www.gmm-tv.com/contents/VBYEO/' },
  { aliases: ['设计爱情', '爱情设计'], en: 'Love Design', th: 'รับ(รัก)ออกแบบ', source: 'https://wetv.vip/en/play/8fejxmjkf8gde4x', thaiSource: 'https://wetv.vip/th/play/8fejxmjkf8gde4x' },
  { aliases: ['爱情毒药'], en: 'Poisonous Love', th: 'พิษรัก', source: 'https://www.youtube.com/watch?v=f18De0fKV8A' },
  { aliases: ['和谐密语', '诡秘契约'], en: 'Harmony Secret', th: 'ดีลลับฉบับเล่นเล่ห์', source: 'https://www.change2561.com/', castSource: 'https://www.iq.com/album/harmony-secret-2025-1kvqlgzlawd?lang=en_us' },
  { aliases: ['爱情诡计'], en: 'Affair', th: 'รักเล่นกล', source: 'https://www.change2561.com/', castSource: 'https://www.iq.com/album/affair-2024-unenjktmzx?lang=en_us' },
];
export const verifiedPeople = [
  { aliases: ['维罗妮卡·帕加诺'], en: 'Renée Veronica Pagano', th: 'เรเน่ เวโรนิก้า ปากาโน', source: 'https://www.imdb.com/title/tt35557156/characters/nm16630366/', thaiSource: 'https://www.youtube.com/watch?v=KnMe5r5r1DM' },
  { aliases: ['普洛伊湘普·素帕莎'], en: 'Jan Ployshompoo Supasap', th: 'แจน พลอยชมพู ศุภทรัพย์', source: 'https://www.gmm-tv.com/news/4214/' },
  { aliases: ['余晶晶'], en: 'Jingjing Yu', th: 'จิงจิง ยู', source: 'https://www.gmm-tv.com/news/4214/' },
  { aliases: ['塔诵·格林尼恩'], en: 'Emi Thasorn', th: 'เอมี่ ทสร', source: 'https://www.gmm-tv.com/contents/VBYEO/' },
  { aliases: ['帕特拉帕·博拉查达苏皖'], en: 'Bonnie Pattraphus', th: 'บอนนี่ ภัทราภัสร์', source: 'https://www.gmm-tv.com/contents/VBYEO/' },
  { aliases: ['素帕萨拉·他那差'], en: 'Supassra Thanachat', th: 'Supassra Thanachat', source: 'https://wetv.vip/en/play/8fejxmjkf8gde4x' },
  { aliases: ['玫缇卡·吉勒诺拉帕'], en: 'Jane Methika Jiranorraphat', th: 'Jane Methika Jiranorraphat', source: 'https://wetv.vip/en/play/8fejxmjkf8gde4x' },
  { aliases: ['班雅帕·汪朋萨塔珀恩'], en: 'Lookmhee Punyapat Wangpongsathaporn', th: 'Lookmhee Punyapat Wangpongsathaporn', source: 'https://www.iq.com/album/harmony-secret-2025-1kvqlgzlawd?lang=en_us' },
  { aliases: ['莎兰帕特·皮德尔'], en: 'Sonya Saranphat Pedersen', th: 'Sonya Saranphat Pedersen', source: 'https://www.iq.com/album/harmony-secret-2025-1kvqlgzlawd?lang=en_us' },
  { aliases: ['纳妮茶·帕缇那西莉'], en: 'Ginny Natnicha Pratipnatsiri', th: 'จินนี่ ณัฐณิชา ประทีปนาฏศิริ', source: 'https://www.yesasia.com/global/kazz-magazine-issue-212-poisonous-love-cover-ginny-jayna/1136806444-0-0-0-en/info.html', thaiSource: 'https://www.youtube.com/watch?v=Q_Dg-JOKrsg' },
  { aliases: ['安吉丽娜·史蒂文斯'], en: 'Jayna Angelina Stevens', th: 'เจน่า แองเจลิน่า สติเวนส์', source: 'https://www.yesasia.com/global/kazz-magazine-issue-212-poisonous-love-cover-ginny-jayna/1136806444-0-0-0-en/info.html', thaiSource: 'https://www.youtube.com/watch?v=Q_Dg-JOKrsg' },
];
const byAlias = new Map([...verifiedSeries, ...verifiedPeople].flatMap(entry => entry.aliases.map(alias => [alias, entry])));
export function verifiedName(source, locale) {
  return locale === 'zh' ? source : byAlias.get(source)?.[locale];
}
export function seriesName(series, locale) {
  return locale === 'zh' ? series.title : verifiedName(series.title, locale) ?? series.titleEn ?? series.title;
}
export function localizeCast(source, locale) {
  if (locale === 'zh') return source;
  let result = source;
  for (const entry of verifiedPeople) for (const alias of entry.aliases) result = result.replaceAll(alias, entry[locale]);
  return result.replace(/领衔主演/g, '').replace(/\s*饰演\s*|饰\s*/g, locale === 'en' ? ' as ' : ' รับบท ').replace(/医生/g, locale === 'en' ? ' (doctor)' : ' (แพทย์)').replace(/与/g, ' / ');
}
