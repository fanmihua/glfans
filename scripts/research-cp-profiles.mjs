// Read-only discovery from the same public catalogue used by the series archive.
// This produces research candidates, never publishes them into app data.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpProfiles } from '../src/features/cp/cp-data.js';
// Weekly default is a due-only search plan, never a catalogue-wide request.
if (!process.argv.includes('--catalogue')) {
  await import('./plan-cp-maintenance.mjs');
  process.exit(0);
}
// Explicit discovery/bootstrap only. Reuse the public directory for 30 days.
const cacheFile = 'output/cp-qa/catalogue-cache.json';
const cache = JSON.parse(await readFile(cacheFile,'utf8').catch(()=>'null'));
const cacheFresh = cache && Date.now()-Date.parse(cache.fetchedAt)<30*86400000;
const endpoint = 'https://gl-spotlight-production.fly.dev/graphql';
const query = `query($cursor:CursorPaginationInput){actresses(cursorPaginationInput:$cursor){edges{node{id name knownAs slug birthDate nationality height profession studies instagram x}}pageInfo{hasNextPage endCursor}}}`;
const candidates = cacheFresh ? cache.candidates : []; const seenCursors = new Set(); let cursor;
if (!cacheFresh) {
do {
  const response = await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables:{cursor:{direction:'FORWARD',limit:50,...(cursor?{cursor}: {})}}}),signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if(payload.errors) throw new Error(JSON.stringify(payload.errors));
  const page = payload.data?.actresses;
  if (!Array.isArray(page?.edges) || !page.pageInfo) throw new Error('Public profile schema changed; app data left unchanged');
  candidates.push(...page.edges.map(edge=>edge.node));
  cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  if (page.pageInfo.hasNextPage && !cursor) throw new Error('Missing pagination cursor; app data left unchanged');
  if (cursor && seenCursors.has(cursor)) throw new Error('Repeated pagination cursor; app data left unchanged');
  if (cursor) seenCursors.add(cursor);
} while(cursor);
await mkdir('output/cp-qa',{recursive:true});
await writeFile(cacheFile,JSON.stringify({fetchedAt:new Date().toISOString(),candidates}));
}
const normalize = value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
const members = [...new Map(cpProfiles.flatMap(cp=>cp.members).map(member=>[member.name,member])).values()];
const results = members.map(member=>({
  member:member.name,
  candidates:candidates.filter(actor=>normalize(member.name)===normalize(`${actor.knownAs} ${actor.name}`) || normalize(member.name)===normalize(actor.name) || normalize(`${actor.knownAs} ${actor.name}`).startsWith(normalize(member.name))),
}));
await mkdir('output/cp-qa',{recursive:true});
await writeFile('output/cp-qa/profile-candidates.json',JSON.stringify({checkedAt:new Date().toISOString(),endpoint,results},null,2)+'\n');
console.log(JSON.stringify({total:members.length,matched:results.filter(result=>result.candidates.length===1).length,needsIdentityReview:results.filter(result=>result.candidates.length!==1).map(result=>result.member),report:'output/cp-qa/profile-candidates.json',appDataChanged:false},null,2));
