import { cpProfiles } from './cp-data.js';
import { noticeForCp } from './cp-timeline.js';

export const statusCheckedAt = '2026-10-09';
// Explicit editorial evidence, never "all profiles minus ended". Recent shared
// projects/activity establish the directory category, not an agency contract.
const recent = (date, source, title, publisher, checkedAt = '2026-09-10') => ({ date, source, title, publisher, checkedAt });
const reviewed = (date, source, title, publisher) => recent(date, source, title, publisher, '2026-09-30');
const octReview = (date, source, title, publisher) => recent(date, source, title, publisher, statusCheckedAt);
const fourElements = reviewed('2026-09-12', 'https://www.thaiticketmajor.com/performance/4-elements-infinite-bonds-fan-meeting.html', '4 Elements Infinite Bonds Fan Meeting', 'North Star Entertainment · ThaiTicketMajor');
const blush = recent('2026-06-23', 'https://www.youtube.com/watch?v=rkEhavadMn0', 'Blush Blossom Fan Fest 2026 · GMMTV LIVE HOUSE', 'GMMTV OFFICIAL');
export const activeEvidence = {
  namtanfilm: blush, milklove: blush, viewmim: blush, janjingjing: blush,
  emibonnie: recent('2026-07-27', 'https://www.youtube.com/watch?v=1dZ-Z7kYsE0', 'Moonshadow · Official Trailer', 'GMMTV OFFICIAL'),
  lingorm: recent('2026-06-13', 'https://www.youtube.com/watch?v=ARNRALBV2Xw', 'In Love Forever · Official Teaser', 'Ch3Thailand'),
  ormsinfolk: recent('2026-11-07', 'https://yanrong.kktix.cc/events/a5d5bde2?locale=en', 'OrmFolk 1st Fan Meeting in Taipei', '曣瑢國際 · KKTIX'),
  namnoey: recent('2026-06-27', 'https://www.youtube.com/watch?v=U2ozG4r_HZw', 'The Fire · Official Trailer', 'North Star Entertainment'),
  lenamiu: recent('2026-07-08', 'https://www.youtube.com/watch?v=N6bdFaf37Ms', 'PLS Love', 'Ch3Thailand'),
  faymay: recent('2026-08-31', 'https://www.youtube.com/watch?v=nJU9vEfR7Go', 'FAYMAY’s Vlog · Huahin', 'FAYMAY entertainment'),
  mimiegarn: recent('2026-09-01', 'https://www.youtube.com/watch?v=eWVtJtYbZgI', 'Third Person · Official Trailer', 'North Star Entertainment'),
  ingcartoon: recent('2026-07-31', 'https://www.youtube.com/watch?v=SY0FBEQ6NjM', 'Fairway of Love · Official Trailer', 'Mojo Muse Management'),
  mingmingnepjune: recent('2026-08-19', 'https://www.youtube.com/watch?v=Pbb7VU0VfYA', 'Juliet & Juliet · Official Trailer', 'one31'),
  bintpuinoon: recent('2026-08-24', 'https://www.youtube.com/watch?v=PNPqobabDiU', 'Khom Khlang · Official Trailer', 'Star Hunter Entertainment'),
  ginjay: reviewed('2026-09-26', 'https://www.youtube.com/watch?v=F1l1mAvSmZo', 'Love On Hire · Official Teaser', 'COPY A BANGKOK'),
  friendpalm: reviewed('2026-09-19', 'https://www.youtube.com/watch?v=FoVP2y29_Tk', 'Resonance · Official Pilot', 'VelCurve Studio Official'),
  tanzanook: reviewed('2026-09-24', 'https://www.youtube.com/watch?v=AWnUGoONk_o', 'YES maybe NO · Official Pilot', "Kongthup’s Channel"),
  ferinpuifai: reviewed('2026-09-12', 'https://www.youtube.com/watch?v=WR-HPcdHxlQ', "Don't Say No Yet · Official Trailer", "H’our channel"),
  pimjipineare: reviewed('2026-09-23', 'https://x.com/wabisabiTH/status/2102725466373464369', 'Built In Love · Official premiere announcement', 'Studio Wabi Sabi'),
  jessietungpang: reviewed('2026-09-14', 'https://x.com/LoveInBloomMono/status/2099514391507153367', 'Love In Bloom · Q1', 'MONO Original'),
  tknur: reviewed('2026-07-18', 'https://www.youtube.com/watch?v=mML5eJ5o1PE', 'Dangerous Queen: Special Edition · Official Teaser Part 2', 'Snur Entertainment'),
  freenbecky: fourElements, engfacharlotte: fourElements, applemim: fourElements,
  lookmheesonya: reviewed('2026-10-09', 'https://pixelticket.com.br/eventos/32854/lookmhee-sonya-everafter-bloom-in-sao-paulo', 'LOOKMHEE SONYA EVERAFTER: BLOOM IN SÃO PAULO', 'GIG Music · PixelTicket'),
  andalookkaew: reviewed('2026-10-16', 'https://www.ticketmelon.com/th/NDEntertainment/andalookkaewunfiltered', 'ANDA LOOKKAEW UNFILTERED SESSION IN TAIPEI', 'ND Entertainment · Ticketmelon'),
};
// Official recent productions; a release is evidence of shared work, not a private relationship.
const chasing = octReview('2026', 'https://www.youtube.com/watch?v=LTuNFLRnh7U', 'Chasing Love · Official Trailer', 'CHANGE2561');
Object.assign(activeEvidence, {
  kapookciize: octReview('2026-09-26', 'https://www.ticketmelon.com/gmmtv/fanday35inVN-AP-Benefit', 'GMMTV FANDAY 35 · Enemies With Benefits cast', 'GMMTV · Ticketmelon'),
  nilenamwan: chasing, faygene: chasing, giftaomsin: chasing,
  myyuchanya: octReview('2026', 'https://www.youtube.com/watch?v=HBi2dQGsuJw', 'AI Girl · Official Trailer', 'MeMindY Official'),
  oombam: octReview('2026-06-12', 'https://www.thaiticketmajor.com/performance/fulfill-final-episode-with-oombam.html', 'Fulfill · Final Episode with OomBam', 'ThaiTicketMajor'),
  fayeatom: octReview('2026', 'https://www.weibo.com/u/7985880343?tabtype=feed', 'By Your Side · BROKEN (Of) LOVE OST', 'Fabel Entertainment'),
});
export function statusForCp(id) {
  const notice = noticeForCp(id);
  if (notice) return { status: 'ended', evidence: notice };
  if (activeEvidence[id]) return { status: 'active', evidence: activeEvidence[id] };
  return { status: 'unverified', evidence: null };
}
export function countCpStatuses(profiles = cpProfiles) {
  return profiles.reduce((counts, cp) => {
    counts.total += 1;
    counts[statusForCp(cp.id).status] += 1;
    return counts;
  }, { total: 0, active: 0, ended: 0, unverified: 0 });
}
export const cpStatusCopy = {
  zh: { active: '合作中', ended: '已结束', unverified: '待核实', label: 'CP 合作状态统计', note: '合作中：近期有已核实的官方双人项目或活动；已结束：有明确的官方双人合作终止通告。其余待核实，不表示已经结束。', checked: '本轮核对' },
  en: { active: 'Collaborating', ended: 'Concluded', unverified: 'Unverified', label: 'CP collaboration status counts', note: 'Collaborating: a recent verified official joint project or activity. Concluded: an explicit official duo-work announcement. Other statuses remain unverified, not presumed ended.', checked: 'Reviewed' },
  th: { active: 'ร่วมงานอยู่', ended: 'ยุติแล้ว', unverified: 'รอยืนยัน', label: 'จำนวนคู่ตามสถานะการร่วมงาน', note: 'ร่วมงานอยู่: มีโปรเจกต์หรือกิจกรรมคู่ทางการล่าสุดที่ตรวจสอบแล้ว ยุติแล้ว: มีประกาศยุติการทำงานคู่ชัดเจน คู่อื่นยังรอยืนยัน ไม่ได้หมายความว่ายุติแล้ว', checked: 'ตรวจสอบเมื่อ' },
};
