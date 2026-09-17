import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import sharp from 'sharp';
import { archiveDramas } from '../src/data/archive-dramas.js';

test('built pages share one logo with module titles, descriptions and exact destinations', async () => {
  const profiles=JSON.parse(await readFile('src/features/cp/generated/index.json','utf8')).profiles;
  const collections=JSON.parse(await readFile('src/data/column-index.json','utf8')).collections;
  const routes=['','archive','archive/calendar','cp','column','memes','about','about/rights',
    ...profiles.map(cp=>`cp/${cp.id}`),...new Set(archiveDramas.map(work=>`archive/${work.year}`)),
    ...archiveDramas.map(work=>`archive/${work.year}/${work.id}`),
    ...collections.flatMap(c=>[`column/${c.slug}`,...c.articles.filter(a=>!a.hidden).map(a=>`column/${c.slug}/${a.slug}`)])];
  const logo=JSON.parse(await readFile('dist/client/share.json','utf8')).image;
  for(const route of routes){
    const dir=`dist/client/${route}`;
    const html=await readFile(`${dir}/index.html`,'utf8');
    const data=JSON.parse(await readFile(`${dir}/share.json`,'utf8'));
    assert.equal(new URL(data.url).pathname,route ? `/${route}/` : '/');
    assert.ok(!data.url.includes('#'));
    assert.ok(html.includes(`property="og:image" content="${data.image}"`),route);
    assert.ok(html.includes(`rel="canonical" href="${data.url}"`),route);
    assert.ok(data.title && data.description,route);
    assert.equal(data.image,logo,route);
    assert.ok(data.title.startsWith('glfans · '),route);
    assert.ok(!data.title.includes('undefined'),route);
    assert.equal((html.match(/property="og:title"/g)||[]).length,1);
  }
  const cp=JSON.parse(await readFile('dist/client/cp/emibonnie/share.json','utf8'));
  assert.equal(cp.title,'glfans · 百家饭'); assert.match(cp.description,/EmiBonnie/);
});
test('filing build does not publish hidden section share pages', async () => {
  for (const route of ['radio','tide-words','admin','column/my-secret-words']) {
    await assert.rejects(readFile(`dist/client/${route}/share.json`, 'utf8'), { code: 'ENOENT' });
  }
  const root=JSON.parse(await readFile('dist/client/share.json','utf8'));
  assert.doesNotMatch(root.description,/坑底文学|电台|共创/);
  assert.match(root.description,/REPO/);
  assert.match(root.description,/表情包/);
  const calendar=JSON.parse(await readFile('dist/client/archive/calendar/share.json','utf8'));
  assert.equal(calendar.title,'glfans · 播出日历');
});
test('share thumbnails are real square JPEGs and lightweight', async () => {
  for (const name of await readdir('dist/client/assets/share')) {
    const bytes=await readFile(`dist/client/assets/share/${name}`);
    const meta=await sharp(bytes).metadata();
    assert.equal(meta.format,'jpeg'); assert.equal(meta.width,512); assert.equal(meta.height,512);
    assert.ok(bytes.length<180_000,`${name} thumbnail is too large`);
  }
});
