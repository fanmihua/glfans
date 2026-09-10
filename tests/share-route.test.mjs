import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShareUrl, installShareRoutes } from '../src/app/share-route.js';

test('shared CP path restores exact detail before homepage routing, preserving query', () => {
  const url = normalizeShareUrl('https://glfans.com/cp/emibonnie/?lang=th&from=singlemessage', '/', true);
  assert.equal(url.hash, '#/cp/emibonnie');
  assert.equal(url.searchParams.get('lang'), 'th');
  assert.equal(url.pathname, '/cp/emibonnie/');
});
test('old hash links upgrade without reload, and CP switching replaces stale path', () => {
  assert.equal(normalizeShareUrl('https://glfans.com/?lang=zh#/cp/emibonnie').pathname, '/cp/emibonnie/');
  assert.equal(normalizeShareUrl('https://glfans.com/cp/emibonnie/#/cp/namtanfilm').pathname, '/cp/namtanfilm/');
});
test('leaving CP clears path; explicit home wins over path even on bootstrap', () => {
  for (const hash of ['#/archive/2024/pluto', '#/', '#/radio', '#/cp']) {
    const url = normalizeShareUrl(`https://glfans.com/cp/emibonnie/?lang=en${hash}`, '/', true);
    assert.equal(url.pathname, hash === '#/' ? '/' : `${hash.slice(1)}/`); assert.equal(url.hash, hash);
  }
});
test('supports deployment prefix and does not interpret arbitrary external redirects', () => {
  const url = normalizeShareUrl('https://example.com/glfans/cp/emibonnie/', '/glfans/', true);
  assert.equal(url.pathname, '/glfans/cp/emibonnie/'); assert.equal(url.hash, '#/cp/emibonnie');
  const unsafe = normalizeShareUrl('https://glfans.com/?redirect=https://evil.example/#/cp/../../admin', '/', true);
  assert.equal(unsafe.origin, 'https://glfans.com'); assert.equal(unsafe.pathname, '/');
});
test('listener sync preserves history state and cleans up', () => {
  const listeners = new Map(); let href = 'https://glfans.com/cp/emibonnie/';
  const host = {location:{get href(){return href;}}, history:{state:{keep:1}, replaceState(state, _, next){assert.equal(state.keep,1); href=next;}},
    addEventListener:(name,fn)=>listeners.set(name,fn), removeEventListener:name=>listeners.delete(name)};
  const stop=installShareRoutes(host);
  assert.equal(new URL(href).hash,'#/cp/emibonnie');
  href='https://glfans.com/cp/emibonnie/#/archive'; listeners.get('hashchange')();
  assert.equal(new URL(href).pathname,'/archive/'); stop(); assert.equal(listeners.size,0);
});
test('every public section and nested archive/article survives fragment removal', () => {
  for (const route of ['archive','archive/2024/pluto','column/us/unsaid-fragments-ep01','memes','radio','tide-words','about/rights','cp']) {
    const shared = normalizeShareUrl(`https://glfans.com/?lang=en#/${route}`);
    shared.hash='';
    const opened=normalizeShareUrl(shared.href,'/',true);
    assert.equal(opened.hash,`#/${route}`); assert.equal(opened.search,'?lang=en');
  }
});
