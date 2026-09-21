import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { archiveDramas } from '../src/data/archive-dramas.js';
import { formatArchiveRange } from '../src/features/archive/archive-format.js';
import { mergeCalendarData } from '../src/features/archive/calendar-data.js';
const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const column = await read('../src/data/column-data.json');
const plain = xml => xml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');

test('Affair roles match CHANGE2561 credits and cannot reuse Harmony Secret roles', async () => {
  // https://www.change2561.com/news/title/535
  const text = plain(column.collections.find(c => c.slug === 'affair').summaryXml);
  assert.match(text, /Lookmhee）饰演 Wanwiwa（Wan）/);
  assert.match(text, /Sonya）饰演 Siangphleng（Pleng）/);
  assert.doesNotMatch(text, /饰演 (Ai|Maple|May)/);
  for (const lang of ['en', 'th']) {
    const dictionary = await read(`../src/i18n/${lang}-ui.json`);
    assert.ok(dictionary['（Lookmhee）饰演 Wanwiwa（Wan）']);
    assert.ok(dictionary['（Sonya）饰演 Siangphleng（Pleng）']);
  }
});

test('REPO premiere dates and regular episode counts agree with the shared archive', () => {
  const aliases = { 'rival-lover': 'enemies-with-benefits', 'designing-love': 'love-design' };
  for (const collection of column.collections.filter(c => !c.hidden)) {
    const drama = archiveDramas.find(d => d.id === (aliases[collection.slug] || collection.slug));
    assert.ok(drama, collection.slug);
    const text = plain(collection.summaryXml);
    const date = text.match(/首播(?:日期|时间)\s*[：:]\s*(\d{4})年(\d+)月(\d+)日/);
    assert.ok(date, collection.slug);
    assert.equal(`${date[1]}-${date[2].padStart(2, '0')}-${date[3].padStart(2, '0')}`, drama.startDate);
    const episodes = text.match(/(?:全|正篇)(\d+)集|集数\s*：(\d+)集/);
    if (episodes) assert.equal(Number(episodes[1] || episodes[2]), drama.episodes, collection.slug);
  }
});

test('reviewed counts and postponed finales stay aligned with published evidence', () => {
  // KONEONEDEE final EP5; WeTV Like A Palette 8 EPs;
  // NineStar June 29 finale report; ThaiTicketMajor SOUL MATE final screening.
  const byId = Object.fromEntries(archiveDramas.map(d => [d.id,d]));
  assert.equal(byId['lucky-my-love'].episodes, 5);
  assert.equal(byId['like-a-palette'].episodes, 8);
  assert.equal(byId['blank-season-2'].endDate, '2024-06-29');
  assert.equal(byId.mate.endDate, '2025-02-18');
});

test('conflicting distribution dates are not presented as verified archive or calendar facts', () => {
  const drama = archiveDramas.find(d => d.id === 'frozen-valentine');
  assert.equal(drama.endDate, null);
  assert.equal(formatArchiveRange(drama), '播出日期口径待核实');
  const data = { series: [], events: [1,2,10].map(episode => ({id:`frozen-valentine:ep:${episode}`,seriesId:'frozen-valentine',episode,date:'2026-02-12',needsReview:false})) };
  const merged = mergeCalendarData(data, {series:[],events:[]});
  assert.equal(merged.events.find(e => e.episode === 1).needsReview, true);
  assert.equal(merged.events.find(e => e.episode === 10).needsReview, true);
  assert.equal(merged.events.find(e => e.episode === 2).needsReview, false);
});
