// Rank the relationship in this work, never the pair's position in the directory.
// Legacy lead/ensemble works omit relationship. Keep each tier's editorial order.
export function relatedCpsForWork(profiles, workId) {
  return profiles
    .map((cp, index) => ({ cp, index, work: cp.works.find(work => work.id === workId) }))
    .filter(item => item.work)
    .map(item => ({ ...item, rank: ['supporting', 'storyline'].includes(item.work.relationship) ? 1 : 0 }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(item => item.cp);
}
