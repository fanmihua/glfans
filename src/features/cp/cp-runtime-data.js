// Tiny directory used by archive/calendar links. Never import editorial data
// here: doing so would pull all 101 actor biographies into unrelated routes.
import index from './generated/index.json';
import { relatedCpsForWork } from './cp-work-order.js';
export const cpProfiles = index.profiles;
export const {verifiedAt, statusCheckedAt, cpStatusCopy, cpChildrenCopy, zodiacLabels} = index;
export const cpsForWork = id => relatedCpsForWork(cpProfiles, id);
export const statusForCp = id => ({status:cpProfiles.find(cp=>cp.id===id)?.status || 'unverified'});
export const countCpStatuses = () => cpProfiles.reduce((counts,cp)=>{counts.total++; counts[cp.status]++; return counts;}, {total:0,active:0,ended:0,unverified:0});
