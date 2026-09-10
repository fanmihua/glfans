// Their little ones, not a merchandise catalogue. Dates are public introductions
// in Thailand, checked against GMMTV's MY IDEAL FAN publication metadata.
const video = id => ({
  url: `https://www.youtube.com/watch?v=${id}`,
  image: `assets/cp/children/${id}.jpg`,
  imageSource: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  publisher: 'GMMTV OFFICIAL',
});
export const cpChildren = {
  namtanfilm: {
    name: 'LUNAR', introduced: '2024-12-07', checkedAt: '2026-09-10',
    source: 'https://x.com/GMMTV/status/1865412198534914250', publisher: 'GMMTV',
    image: 'assets/cp/children/lunar.webp', imageSource: 'https://pbs.twimg.com/media/GeHD93aaUAAI0bh?format=webp&name=large',
    video: video('3ZHj7DMH3sE'),
    story: {
      zh: '刚破壳的小鸭子，遇见圆滚滚的熊猫，再别上一朵勿忘我。Namtan 和 Film 把这些小小的心意画在一起，LUNAR 就这样诞生了，带着两个人的影子，也代表着喜欢她们的大家。',
      en: 'A newly hatched duckling, a round little panda and a forget-me-not flower. Namtan and Film brought these details together to create LUNAR: a little one carrying something of them both, and representing the fans who love them.',
      th: 'ลูกเป็ดเพิ่งออกจากไข่ แพนด้าตัวกลม และดอกฟอร์เก็ตมีน็อต Namtan กับ Film นำรายละเอียดเล็ก ๆ เหล่านี้มาวาดรวมกันเป็น LUNAR เจ้าตัวเล็กที่มีส่วนหนึ่งของทั้งคู่ และเป็นตัวแทนแฟน ๆ ที่รักพวกเธอ',
    },
  },
  emibonnie: {
    name: 'ANY', introduced: '2025-03-14', checkedAt: '2026-09-10',
    source: 'https://x.com/GMMTV/status/1900427925884654002', publisher: 'GMMTV',
    image: 'assets/cp/children/any.webp', imageSource: 'https://pbs.twimg.com/media/Gl7tJ2qbYAckP6G?format=webp&name=large',
    video: video('R0aBXZ2Lypg'),
    story: {
      zh: '短发的小女孩，披着软软的兔子斗篷，身后藏着一双蝴蝶翅膀。这是 Emi 和 Bonnie 一起画出的 ANY，她带着笑容和爱，准备飞到喜欢她们的人身边。',
      en: 'A short-haired little girl in a soft rabbit cloak, with butterfly wings tucked behind her. Emi and Bonnie drew ANY together, imagining a little one ready to fly out and share smiles and love with their fans.',
      th: 'เด็กหญิงผมสั้นในผ้าคลุมกระต่ายนุ่ม ๆ พร้อมปีกผีเสื้อที่ด้านหลัง นี่คือ ANY ที่ Emi กับ Bonnie ช่วยกันวาด พร้อมโบยบินไปส่งรอยยิ้มและความรักให้แฟน ๆ',
    },
  },
  milklove: {
    name: 'MUVMUV', introduced: '2024-05-24', checkedAt: '2026-09-10',
    source: 'https://x.com/GMMTV/status/1794022543143366684', publisher: 'GMMTV',
    image: 'assets/cp/children/muvmuv.webp', imageSource: 'https://pbs.twimg.com/media/GOVKgt3a8AAkene?format=webp&name=large',
    video: video('qG8WquuErt8'),
    story: {
      zh: '萨摩耶的软乎乎，加上橘猫的小耳朵，手里还捧着一盒粉色牛奶。Milk 和 Love 共同创造的 MUVMUV，把两个人的名字与可爱装在一起，也把快乐递给每一个喜欢她们的人。',
      en: 'A fluffy Samoyed with orange-cat ears, holding a little carton of pink milk. Created together by Milk and Love, MUVMUV brings their names and playful touches into one little character, sharing that happiness with their fans.',
      th: 'ซามอยด์ขนฟูนุ่มกับหูแมวส้ม ในมือถือกล่องนมชมพู MUVMUV ที่ Milk กับ Love สร้างด้วยกัน รวมชื่อและความน่ารักของทั้งคู่ไว้ในเจ้าตัวเล็ก พร้อมส่งต่อความสุขให้แฟน ๆ',
    },
  },
  janjingjing: {
    name: 'JEWEL', introduced: '2026-05-25', checkedAt: '2026-09-10',
    source: 'https://x.com/any_GMMTV/status/2065078560302481731', publisher: 'ANY · GMMTV',
    image: 'assets/cp/children/jewel.webp', imageSource: 'https://pbs.twimg.com/media/HKih_dmbkAI-jon?format=webp&name=large',
    video: video('eEtCIQeJFUo'),
    story: {
      zh: '一只漂亮的小白狐，眼睛灵动，系着标志性的红色蝴蝶结。Jan 和 Jingjing 把两个人的神采放进 JEWEL 的模样里；从一张画纸开始，她也有了属于自己的小小故事。',
      en: 'A little white fox with expressive eyes and a signature red ribbon. Jan and Jingjing brought touches of their own charm into JEWEL. What began on a sheet of drawing paper now has a little story of her own.',
      th: 'จิ้งจอกขาวตัวน้อย ตาเฉี่ยวสดใสกับโบว์แดงอันเป็นเอกลักษณ์ Jan กับ Jingjing ใส่เสน่ห์ของทั้งคู่ลงใน JEWEL จากภาพบนกระดาษ สู่เรื่องราวเล็ก ๆ ของน้องเอง',
    },
  },
  viewmim: {
    name: 'VIMMY', introduced: '2026-05-18', checkedAt: '2026-09-10',
    source: 'https://x.com/view_benyapa/status/2064985514781102166', publisher: 'View Benyapa',
    image: 'assets/cp/children/vimmy.webp', imageSource: 'https://pbs.twimg.com/media/HKhNTdGaAAAAica?format=webp&name=large',
    video: video('knCmrEw6og8'),
    story: {
      zh: '长耳朵的可卡犬，遇见甜甜的小蜜蜂，就成了 VIMMY。View 和 Mim 把活泼与柔软揉进她的模样里，让这个带着小翅膀的孩子，飞来和大家打招呼。',
      en: 'A long-eared Cocker Spaniel meets a sweet little bee, and VIMMY comes to life. View and Mim brought brightness and gentleness into her design: a little one with wings, ready to fly over and say hello.',
      th: 'ค็อกเกอร์สแปเนียลหูยาวมาพบกับผึ้งน้อยแสนหวาน จนกลายเป็น VIMMY ที่ View กับ Mim ใส่ทั้งความร่าเริงและความอ่อนโยนไว้ในตัวน้อง พร้อมกางปีกเล็ก ๆ บินมาทักทายทุกคน',
    },
  },
};
export const childForCp = id => cpChildren[id] || null;
export const cpChildrenCopy = {
  zh: { title: '她们的娃', note: '从两个人的笔下，来到大家身边。', designed: '一起画出的', hello: '初次见面', story: '一起画出你', watch: '看她们设计的过程', image: '官方公开形象', photo: '她们分享的照片' },
  en: { title: 'Their little one', note: 'From their sketches, into a shared little world.', designed: 'Created together by', hello: 'First hello', story: 'Bringing you to life', watch: 'Watch them create', image: 'Official character artwork', photo: 'A photo they shared' },
  th: { title: 'เจ้าตัวเล็กของทั้งคู่', note: 'จากปลายปากกาของทั้งคู่ มาสู่อ้อมใจของทุกคน', designed: 'ร่วมกันวาดโดย', hello: 'ทักทายครั้งแรก', story: 'วันที่ช่วยกันวาดเธอ', watch: 'ดูทั้งคู่ช่วยกันออกแบบ', image: 'ภาพคาแรกเตอร์ทางการ', photo: 'ภาพที่พวกเธอแบ่งปัน' },
};
