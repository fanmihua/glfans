import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fingerprint, planReviews, nextReview, recordReviews } from '../scripts/lib/cp-maintenance.mjs';
import { reviewTargets } from '../scripts/lib/cp-review-targets.mjs';
const target = (extra={})=>({id:'actor:Example:birthday',value:'2000-01-01',missing:false,policy:'stable',intervalDays:90,checkedAt:'2026-09-10',...extra});
const stateFor = t=>({version:1,records:{[t.id]:{fingerprint:fingerprint(t.value),lastAttemptAt:'2026-09-10',outcome:t.missing?'missing':'verified',misses:t.missing?1:0}}});
test('verified stable facts never incur routine searches; explicit correction and changed facts do',()=>{
  const t=target(), state=stateFor(t);
  assert.equal(planReviews([t],state,'2030-01-01').due.length,0);
  assert.equal(planReviews([t],state,'2026-09-10',[t.id]).due.length,1);
  assert.equal(planReviews([{...t,value:'2001-01-01'}],state,'2026-09-10').due[0].reason,'data-changed');
});
test('links and current projects have independent due dates',()=>{
  const link=target({policy:'links'}), news=target({policy:'current-news',intervalDays:7});
  assert.equal(planReviews([link],stateFor(link),'2026-09-17').due.length,0);
  assert.equal(planReviews([news],stateFor(news),'2026-09-17').due.length,1);
});
test('missing searches back off to 180 days and known facts cannot be erased',()=>{
  const t=target({value:null,missing:true});let s=stateFor(t);
  assert.equal(nextReview(t,s.records[t.id]),'2026-09-24');
  s=recordReviews([t],s,[{id:t.id,outcome:'missing',queries:['Example birthday official']}],'2026-09-24');
  assert.equal(nextReview(t,s.records[t.id]),'2026-10-22');
  assert.equal(nextReview(t,{...s.records[t.id],misses:20}),'2027-03-23');
  assert.throws(()=>recordReviews([target()],{},[{id:t.id,outcome:'missing',queries:['x']}],'2026-09-24'));
});
test('reviews require evidence; repeated recording is idempotent; conflict/error remains actionable',()=>{
  const t=target(),s=stateFor(t);
  assert.throws(()=>recordReviews([t],s,[{id:t.id,outcome:'verified'}],'2026-09-10'));
  const r=[{id:t.id,outcome:'unchanged',sources:['https://example.org/actor']}];
  const next=recordReviews([t],s,r,'2026-09-10');
  assert.deepEqual(recordReviews([t],next,r,'2026-09-10'),next);
  const failed=recordReviews([t],s,[{id:t.id,outcome:'error',note:'HTTP 403; do not bypass'}],'2026-09-10');
  assert.equal(planReviews([t],failed,'2026-09-17').due.length,1);
  const conflict=recordReviews([t],s,[{id:t.id,outcome:'conflict',note:'Two official dates conflict'}],'2026-09-10');
  assert.equal(planReviews([t],conflict,'2026-09-17').due[0].reason,'conflict');
});
test('inventory deduplicates actors, excludes zodiac searches, and slows concluded CP discovery',()=>{
  const targets=reviewTargets();
  assert.equal(new Set(targets.map(t=>t.id)).size,targets.length);
  assert.equal(targets.filter(t=>t.field==='fullName').length,101);
  assert.equal(targets.filter(t=>t.field==='zodiac').length,0);
  assert.equal(targets.filter(t=>t.policy==='archived-news'&&t.intervalDays===90).length,4);
});
test('weekly research command defaults to due-only planning; bulk catalogue is explicit and cached',async()=>{
  const source=await readFile('scripts/research-cp-profiles.mjs','utf8');
  assert.match(source,/if \(!process\.argv\.includes\('--catalogue'\)\)/);
  assert.match(source,/30\*86400000/);
});
