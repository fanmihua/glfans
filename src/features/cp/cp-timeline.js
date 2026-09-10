// Date precision is intentional. A work's archive year is NOT a premiere date,
// and the earliest work in this collection is NOT an inferred CP formation date.
import { childForCp } from './cp-children.js';
export const personalMilestones = {
  namtanfilm: [
    { id: 'namtan-who-are-you', date: '2020', lane: 0, kind: 'personalWork', title: 'Who Are You', source: 'https://www.gmmgrammy.com/newsroom/news-single.php?id=7472', publisher: 'GMM Grammy', description: { zh: 'Namtan 主演悬疑校园剧，分饰 Meen 与 Mind。', en: 'Namtan stars as Meen and Mind in the mystery drama.', th: 'Namtan แสดงนำเป็นมีนและมายในซีรีส์แนวลึกลับ' } },
    { id: 'film-home-school', date: '2023', lane: 1, kind: 'personalWork', title: 'Home School', source: 'https://www.gmm-tv.com/contents/playlist/G7m8J/?v=8jbx6', publisher: 'GMMTV', description: { zh: 'Film 出演《Home School》，并与剧组一同参加 School Rangers。', en: 'Film appears in Home School and joins its cast on School Rangers.', th: 'Film ร่วมแสดง Home School และออกรายการ School Rangers กับทีมนักแสดง' } },
    { id: 'pluto-announced', date: '2023-10-17', lane: 'joint', kind: 'pairAnnouncement', title: 'Pluto', source: 'https://thestandard.co/gmmtv2024-upabove-part1/', publisher: 'THE STANDARD · GMMTV 2024 event report', description: { zh: 'GMMTV 2024 发布会上公布双人主演《Pluto》。这是公开合作节点，不是私人关系起点。', en: 'Announced as the leads of Pluto at GMMTV 2024. A public work milestone, not a private relationship date.', th: 'ประกาศแสดงนำคู่กันใน Pluto ที่งาน GMMTV 2024 เป็นหมุดหมายการร่วมงาน ไม่ใช่วันเริ่มความสัมพันธ์ส่วนตัว' } },
  ],
};
export const cpNotices = {
  yadatan: {
    id: 'tanyada-joint-work-concluded', date: '2026-06-02', status: 'jointWorkConcluded',
    publisher: 'Channel 3 · Play Park', source: 'https://x.com/PlayparkCH3/status/2061754833351451088', checkedAt: '2026-09-10',
    summary: {
      zh: '三台公告：Tan 与 Yada 双方同意结束工作搭档关系。公告感谢观众过去的支持，并邀请大家继续关注两人之后各自的作品。',
      en: 'Channel 3 announced that Tan and Yada mutually agreed to end their working partnership, and thanked fans for supporting their work together and their future individual projects.',
      th: 'ช่อง 3 ประกาศว่า Tan และ Yada ตกลงร่วมกันยุติการทำงานคู่กัน พร้อมขอบคุณแฟน ๆ และขอให้สนับสนุนผลงานในอนาคตของทั้งสองต่อไป',
    },
    images: [
      { language: 'th', image: 'assets/cp/notices/tanyada-2026-06-02-th.webp', source: 'https://pbs.twimg.com/media/HJzTFvza8AAIXKY?format=webp&name=large' },
      { language: 'en', image: 'assets/cp/notices/tanyada-2026-06-02-en.webp', source: 'https://pbs.twimg.com/media/HJzTFv0akAASuhd?format=webp&name=large' },
    ],
  },
  memiice: {
    id: 'icememi-joint-work-concluded', date: '2026-07-17', status: 'jointWorkConcluded',
    publisher: 'Heart Pop Studio', source: 'https://x.com/HeartPopStudio/status/2077938603075018757', checkedAt: '2026-09-10',
    summary: {
      zh: 'Heart Pop Studio 宣布 Ice 与 Memi 结束双人合作安排，说明这是基于各方工作方向与未来目标作出的决定。既有共同作品继续作为这一阶段的记录保留。',
      en: 'Heart Pop Studio announced the conclusion of Ice and Memi’s duo partnership, citing the parties’ working directions and future goals. Their shared work remains part of this archive.',
      th: 'Heart Pop Studio ประกาศยุติการทำงานคู่ของ Ice และ Memi ตามทิศทางการทำงานและเป้าหมายในอนาคตของทุกฝ่าย ผลงานร่วมกันยังคงเก็บไว้ในแฟ้มนี้',
    },
    images: [
      { language: 'th', image: 'assets/cp/notices/icememi-2026-07-17-th.webp', source: 'https://pbs.twimg.com/media/HNZSJJKb0AAWEHC?format=webp&name=large' },
      { language: 'en', image: 'assets/cp/notices/icememi-2026-07-17-en.webp', source: 'https://pbs.twimg.com/media/HNZSJJHbYAAa8ry?format=webp&name=large' },
    ],
  },
  enjoyjune: {
    id: 'enjoyjune-joint-work-concluded', date: '2026-07-23', status: 'jointWorkConcluded',
    publisher: 'Conversation Thailand · Media Passion', source: 'https://x.com/conversation_tl/status/2080246737474814097', checkedAt: '2026-09-10',
    summary: {
      zh: 'Conversation Thailand 公告：Enjoy 与 June 自 2026 年 7 月 23 日起结束双人合作。Enjoy 同时结束公司管理合作、转为独立艺人；June 继续留在公司发展。',
      en: 'Conversation Thailand announced that Enjoy and June concluded their duo work on 23 July 2026. Enjoy also ended her agency management agreement to work independently; June remains with the company.',
      th: 'Conversation Thailand ประกาศว่า Enjoy และ June ยุติการทำงานคู่ตั้งแต่ 23 กรกฎาคม 2026 โดย Enjoy ออกจากการดูแลของบริษัทเพื่อทำงานอิสระ ส่วน June ยังคงอยู่กับบริษัท',
    },
    images: [
      { language: 'th', image: 'assets/cp/notices/enjoyjune-2026-07-23-th.webp', source: 'https://pbs.twimg.com/media/HN6FYBFbAAAqNG4?format=webp&name=large' },
      { language: 'en', image: 'assets/cp/notices/enjoyjune-2026-07-23-en.webp', source: 'https://pbs.twimg.com/media/HN6FX4NaQAA32-1?format=webp&name=large' },
    ],
  },
  graceoaey: {
    id: 'graceoaey-joint-work-concluded', date: '2025-12-04', status: 'jointWorkConcluded',
    publisher: 'NEZT MEDIA · ZENSE MORE', source: 'https://x.com/zense_more/status/1996565165555548309', checkedAt: '2026-09-10',
    summary: {
      zh: 'NEZT 公告：Grace 与 Oaey 双方同意结束共同工作活动，决定考虑了各自的职业方向与未来目标。',
      en: 'NEZT announced that Grace and Oaey mutually agreed to conclude their joint work activities, considering their individual career directions and future goals.',
      th: 'NEZT ประกาศว่า Grace และ Oaey ได้ตกลงร่วมกันยุติการทำงานคู่กัน โดยพิจารณาทิศทางอาชีพและเป้าหมายในอนาคตของแต่ละคน',
    },
    images: [
      { language: 'th', image: 'assets/cp/notices/graceoaey-2025-12-04-th.webp', source: 'https://pbs.twimg.com/media/G7U5bu8bIAAAIMa?format=webp&name=large' },
      { language: 'en', image: 'assets/cp/notices/graceoaey-2025-12-04-en.webp', source: 'https://pbs.twimg.com/media/G7U5bvFbsAA7vRm?format=webp&name=large' },
    ],
  },
};
export const noticeForCp = id => cpNotices[id] || null;
export function timelineForCp(cp, media = []) {
  const milestones = [...(personalMilestones[cp.id] || []), ...cp.works.map(work => ({
    ...work, id: `work-${work.id}`, workId: work.id, date: work.year, lane: 'joint', kind: 'sharedWork',
  })), ...media.filter(item => item.date && item.category === 'music').map(item => ({
    ...item, id: `music-${item.id}`, lane: item.scope === 'solo' ? item.memberIndex : 'joint', kind: item.kind === 'mv' ? 'videoRelease' : 'musicRelease',
  }))];
  const notice = noticeForCp(cp.id);
  const child = childForCp(cp.id);
  if (child) milestones.push({ id: `child-${child.name}`, title: child.name, date: child.introduced, lane: 'joint', kind: 'characterWelcome', source: child.video.url, sectionId: 'cp-children' });
  if (notice) milestones.push({ ...notice, lane: 'joint', kind: 'conclusion' });
  // Year-only events stay in their own year; their order does not claim a day.
  milestones.sort((a, b) => a.date.localeCompare(b.date));
  return [...milestones, ...(cp.upcoming || []).map(work => ({
    ...work, id: `pending-${work.id}`, date: null, lane: 'joint', kind: 'pendingWork',
  }))];
}
