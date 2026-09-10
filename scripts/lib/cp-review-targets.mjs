import { cpProfiles, verifiedAt } from '../../src/features/cp/cp-data.js';
import { profileForMember } from '../../src/features/cp/member-profiles.js';
import { cpCommunities } from '../../src/features/cp/cp-communities.js';
import { mediaForCp } from '../../src/features/cp/cp-media.js';
import { personalMilestones, noticeForCp } from '../../src/features/cp/cp-timeline.js';
export function reviewTargets() {
  const actors = [...new Map(cpProfiles.flatMap(cp=>cp.members).map(m=>[m.name,m])).values()];
  const targets = [];
  for (const member of actors) {
    const profile = profileForMember(member);
    for (const field of ['fullName','birthday','heightCm','instagram','x','weibo']) {
      const value = profile[field];
      targets.push({id:`actor:${member.name}:${field}`,actor:member.name,field,value:value || null,missing:!value,
        policy:['fullName','birthday','heightCm'].includes(field)?'stable':'links',intervalDays:90,checkedAt:profile.checkedAt || verifiedAt,
        sources:profile.references.map(r=>r.url),query:`${member.name} ${field} official`});
    }
  }
  for (const cp of cpProfiles) {
    const topic = cpCommunities[cp.id];
    targets.push({id:`cp:${cp.id}:community`,cpId:cp.id,field:'community',value:topic?.url || null,missing:!topic,policy:'links',intervalDays:90,checkedAt:topic?.checkedAt || verifiedAt,query:`${cp.names.join(' ')} 微博 超话`});
    const ended = Boolean(noticeForCp(cp.id));
    targets.push({id:`cp:${cp.id}:news`,cpId:cp.id,field:'news',value:{works:cp.works,upcoming:cp.upcoming || [],events:cp.events,media:mediaForCp(cp.id).map(m=>m.id),notice:noticeForCp(cp.id)?.id},missing:false,policy:ended?'archived-news':'current-news',intervalDays:ended?90:7,checkedAt:verifiedAt,query:`${cp.names.join(' ')} official new project MV event announcement`});
    const milestones = personalMilestones[cp.id] || [];
    targets.push({id:`cp:${cp.id}:history`,cpId:cp.id,field:'history',value:milestones,missing:milestones.length===0,policy:'stable',intervalDays:180,checkedAt:verifiedAt,query:`${cp.members.map(m=>m.name).join(' ')} official biography filmography`});
  }
  return targets;
}
