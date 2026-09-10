import { createHash } from 'node:crypto';
export const DAY = 86400000;
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
export const addDays = (date, days) => new Date(Date.parse(date.slice(0,10)+'T00:00:00Z') + days*DAY).toISOString().slice(0,10);
export function nextReview(target, record) {
  if (record?.outcome === 'conflict') return record.nextCheckAt || record.lastAttemptAt;
  if (record?.outcome === 'error') return addDays(record.lastAttemptAt, 7);
  if (!target.missing && target.policy === 'stable') return null;
  const base = record?.lastAttemptAt || target.checkedAt;
  const interval = target.missing ? Math.min(180, 14 * 2 ** Math.max(0,(record?.misses || 1)-1)) : target.intervalDays;
  return addDays(base, interval);
}
export function planReviews(targets, state, today, forcedIds=[]) {
  const forced = new Set(forcedIds);
  const rows = targets.map(target=>{
    const record = state.records[target.id];
    const changed = record && record.fingerprint !== fingerprint(target.value);
    const nextCheckAt = nextReview(target, record);
    return {...target, fingerprint:fingerprint(target.value), nextCheckAt,
      reason:forced.has(target.id) ? 'explicit-review' : changed ? 'data-changed' : record?.outcome === 'conflict' ? 'conflict' : target.missing ? 'missing' : target.policy,
      due:forced.has(target.id) || Boolean(changed) || Boolean(nextCheckAt && nextCheckAt<=today)};
  });
  return {date:today,total:rows.length,due:rows.filter(r=>r.due),skipped:rows.filter(r=>!r.due).map(({id,nextCheckAt,policy})=>({id,nextCheckAt,policy}))};
}
export function recordReviews(targets, state, results, today) {
  const next = structuredClone(state);
  const inventory = new Map(targets.map(t=>[t.id,t]));
  const seen = new Set();
  for (const result of results) {
    const target = inventory.get(result.id);
    if (!target || seen.has(result.id)) throw new Error(`Unknown or duplicate review target: ${result.id}`);
    seen.add(result.id);
    if (!['verified','unchanged','missing','error','conflict'].includes(result.outcome)) throw new Error('Invalid outcome');
    if (['verified','unchanged'].includes(result.outcome) && !(result.sources?.length)) throw new Error('Verified reviews require evidence URLs');
    if (['verified','unchanged'].includes(result.outcome) && target.missing) throw new Error('Apply verified facts to editorial data before recording success');
    if (result.outcome === 'missing' && (!target.missing || !result.queries?.length)) throw new Error('Missing outcome requires a missing field and actual search queries');
    if (['error','conflict'].includes(result.outcome) && !result.note) throw new Error('Errors/conflicts require a note');
    for (const source of result.sources || []) if (!/^https:\/\//.test(source)) throw new Error('Evidence must use HTTPS');
    const old = next.records[target.id];
    if (old?.lastAttemptAt === today && JSON.stringify(old.review) === JSON.stringify(result)) continue;
    next.records[target.id] = {
      fingerprint:fingerprint(target.value), lastAttemptAt:today,
      lastVerifiedAt:['verified','unchanged'].includes(result.outcome) ? today : old?.lastVerifiedAt || null,
      outcome:result.outcome, misses:result.outcome === 'missing' ? (old?.misses || 0)+1 : ['verified','unchanged'].includes(result.outcome) ? 0 : old?.misses || 0,
      review:result,
      ...(result.outcome === 'conflict' ? {nextCheckAt:addDays(today,7)} : {}),
    };
  }
  return next;
}
