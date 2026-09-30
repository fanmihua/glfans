import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { cpProfiles, findCp } from '../src/features/cp/cp-data.js';
import { filterCps } from '../src/features/cp/cp-names.js';
import { timelineForCp } from '../src/features/cp/cp-timeline.js';
import { localizedWorkTitle, seriesName } from '../src/i18n/proper-names.js';
import { archiveSearchResults } from '../src/features/archive/archive-search.js';
import { createAppSnapshot } from '../scripts/lib/app-content.mjs';

const renamed = [
  { id: 'khom-khlang', zh: '镇灵', en: 'Khom Khlang', th: 'Khom Khlang', cpId: 'bintpuinoon', aliases: ['女警与萨满'] },
  { id: 'love-on-hire', zh: '分手代理', en: 'Love On Hire', th: 'รับจ้างเลิกรัก', cpId: 'ginjay', aliases: [] },
];
const archive = new Map(archiveDramas.map(work => [work.id, work]));

test('the two user-named series preserve IDs and English/Thai titles across archive and CP work displays', () => {
  for (const entry of renamed) {
    const drama = archive.get(entry.id);
    assert.equal(drama.title, entry.zh);
    assert.equal(drama.titleEn, entry.en);
    assert.match(drama.sourceUrl, /^https:\/\//);
    const cp = findCp(entry.cpId);
    const work = cp.works.find(work => work.id === entry.id);
    assert.equal(work.title, entry.zh);
    const event = timelineForCp(cp).find(event => event.workId === entry.id);
    for (const locale of ['zh', 'en', 'th']) {
      assert.equal(seriesName(drama, locale), entry[locale]);
      assert.equal(localizedWorkTitle(work, locale), entry[locale]);
      assert.equal(localizedWorkTitle(event, locale), entry[locale]);
    }
    assert.ok(cp.intro.zh.includes(entry.zh));
    assert.ok(!cp.intro.en.includes(entry.zh));
    assert.ok(cp.intro.en.includes(entry.en));
  }
  assert.equal(localizedWorkTitle({id:'pluto',title:'Pluto'}, 'zh'), 'Pluto', 'this request does not rename any other CP work');
});

test('new Chinese, former Chinese and original English names still find the same archive and CP', () => {
  for (const entry of renamed) for (const query of [entry.zh, entry.en, ...entry.aliases]) {
    assert.equal(archiveSearchResults(query, archiveDramas, cpProfiles)[0]?.href, `#/archive/2026/${entry.id}`);
    assert.ok(filterCps(cpProfiles, query, archive).some(cp => cp.id === entry.cpId));
  }
});

test('App shared catalog, dictionaries and CP searches carry both names without leaking Chinese into English', async () => {
  const snapshot = await createAppSnapshot(process.cwd());
  for (const entry of renamed) {
    assert.equal(snapshot.catalog.dramas.find(work => work.id === entry.id).title, entry.zh);
    assert.equal(snapshot.en[entry.zh], entry.en);
    assert.equal(snapshot.th[entry.zh], entry.th);
    const cp = snapshot.cpCatalog.profiles.find(cp => cp.id === entry.cpId);
    for (const name of [entry.zh, entry.en, ...entry.aliases]) assert.ok(cp.searchTerms.includes(name), name);
  }
});
