import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { reviewTargets } from './lib/cp-review-targets.mjs';
import { planReviews, recordReviews, fingerprint } from './lib/cp-maintenance.mjs';
const args = process.argv.slice(2);
const arg = name => args.includes(name) ? args[args.indexOf(name)+1] : undefined;
const today = arg('--date') || new Date().toISOString().slice(0,10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || new Date(today).toISOString().slice(0,10)!==today) throw new Error('Invalid review date');
const file = 'src/data/cp-maintenance-state.json';
let state = JSON.parse(await readFile(file,'utf8').catch(()=>'{"version":1,"records":{}}'));
const targets = reviewTargets();
if (args.includes('--init')) {
  if (Object.keys(state.records).length) throw new Error('Maintenance state already initialized; refusing overwrite');
  state.records = Object.fromEntries(targets.map(t=>[t.id,{fingerprint:fingerprint(t.value),lastAttemptAt:t.checkedAt,lastVerifiedAt:t.missing?null:t.checkedAt,outcome:t.missing?'missing':'verified',misses:t.missing?1:0}]));
  await writeFile(file,JSON.stringify(state,null,2)+'\n');
}
if (arg('--record')) {
  const results = JSON.parse(await readFile(arg('--record'),'utf8'));
  state = recordReviews(targets,state,results,today);
  if (args.includes('--apply')) await writeFile(file,JSON.stringify(state,null,2)+'\n');
  else console.log('Review ledger dry run; use --apply after verifying evidence. Editorial facts never changed by this command.');
}
const plan = planReviews(targets,state,today,(arg('--force') || '').split(',').filter(Boolean));
// One actor/source investigation can satisfy several due fields; do not search
// the same actor separately for birthday, height and every missing platform.
plan.searchGroups = [...new Set(plan.due.map(t=>t.actor || t.cpId))].map(subject=>({subject,targets:plan.due.filter(t=>(t.actor || t.cpId)===subject).map(t=>({id:t.id,field:t.field,query:t.query}))}));
await mkdir('output/cp-qa',{recursive:true});
await writeFile('output/cp-qa/maintenance-plan.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({date:today,total:plan.total,due:plan.due.length,stableSkipped:plan.skipped.filter(t=>t.policy==='stable'&&!t.nextCheckAt).length,report:'output/cp-qa/maintenance-plan.json'},null,2));
