import { cpProfiles } from './cp-data.js';
import { profileForMember } from './member-profiles.js';
import { cpCommunities } from './cp-communities.js';
import { socialNeedsReview } from './actor-socials.js';

export function profileCoverage() {
  const members = [...new Map(cpProfiles.flatMap(cp => cp.members).map(member => [member.name, member])).values()];
  const profiles = members.map(member => ({ name: member.name, ...profileForMember(member) }));
  return {
    cpCount: cpProfiles.length,
    actorCount: profiles.length,
    birthdayWithMonthDay: profiles.filter(profile => profile.birthday || profile.birthdayMonthDay).length,
    fields: Object.fromEntries(['fullName', 'birthday', 'heightCm', 'instagram', 'x', 'weibo'].map(field => [field, profiles.filter(profile => Boolean(profile[field])).length])),
    communityCount: Object.keys(cpCommunities).length,
    // Missing information is a research backlog, not evidence that no account exists.
    missing: profiles.map(profile => ({ name: profile.name, fields: ['birthday', 'instagram', 'x', 'weibo'].filter(field => !profile[field]) })).filter(item => item.fields.length),
    missingCommunities: cpProfiles.filter(cp => !cpCommunities[cp.id]).map(cp => cp.id),
    needsReview: socialNeedsReview,
  };
}
