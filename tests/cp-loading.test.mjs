import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { cpProfiles } from '../src/features/cp/cp-data.js';
import { profileForMember } from '../src/features/cp/member-profiles.js';
test('all generated CP details preserve both actor profiles and shared work identity',async()=>{
  for (const cp of cpProfiles) {
    const data=JSON.parse(await readFile(`src/features/cp/generated/${cp.id}.json`));
    assert.equal(data.cp.id,cp.id);
    assert.deepEqual(data.cp.works,cp.works);
    for(let i=0;i<2;i++) assert.equal(data.cp.members[i].profile.fullName,profileForMember(cp.members[i]).fullName);
    for(const [source,variants] of Object.entries(data.responsive)) {
      assert.ok(variants.length>=1,source);
      assert.ok(variants[0].width<=480);
      for(const variant of variants) assert.ok((await stat(`public/${variant.path}`)).size>0);
    }
  }
});
test('archive links and directory do not import biography datasets; CP details load lazily',async()=>{
  for(const file of ['CpRelatedLinks.jsx','CpDirectory.jsx','CpStats.jsx','cp-runtime-data.js','CpJournal.jsx','CpChildren.jsx','CpPage.jsx']) {
    const text=await readFile(`src/features/cp/${file}`,'utf8');
    assert.doesNotMatch(text,/from ['"].*(?:actor-profiles|actor-socials|member-profiles|cp-data|cp-media|cp-timeline)\.js/);
  }
  const index=JSON.parse(await readFile('src/features/cp/generated/index.json'));
  assert.equal(index.profiles.length,51);
  assert.ok(index.profiles.every(cp=>cp.members.every(m=>!m.birthday&&!m.instagram&&!m.references)));
  assert.match(await readFile('src/features/cp/CpPage.jsx','utf8'),/import\.meta\.glob/);
});
