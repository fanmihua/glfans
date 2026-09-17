import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeShareUrl, normalizeDocumentUrl, shareMetadataEndpoint, installShareRoutes, installShareMetadata } from '../src/app/share-route.js';

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
test('leaving CP selects the requested public route; home and hidden routes select archive', () => {
  for (const [hash, route] of [['#/archive/2024/pluto','archive/2024/pluto'], ['#/','archive'], ['#/radio','archive'], ['#/cp','cp']]) {
    const url = normalizeShareUrl(`https://glfans.com/cp/emibonnie/?lang=en${hash}`, '/', true);
    assert.equal(url.pathname, `/${route}/`); assert.equal(url.hash, `#/${route}`);
  }
});
test('supports deployment prefix and does not interpret arbitrary external redirects', () => {
  const url = normalizeShareUrl('https://example.com/glfans/cp/emibonnie/', '/glfans/', true);
  assert.equal(url.pathname, '/glfans/cp/emibonnie/'); assert.equal(url.hash, '#/cp/emibonnie');
  const unsafe = normalizeShareUrl('https://glfans.com/?redirect=https://evil.example/#/cp/../../admin', '/', true);
  assert.equal(unsafe.origin, 'https://glfans.com'); assert.equal(unsafe.pathname, '/archive/');
  assert.equal(unsafe.hash, '#/archive');
});
test('hidden paths and hashes fall back to archive in every locale and deployment prefix', () => {
  const hidden = ['home','admin','admin/dashboard','radio','tide-words','unknown','cp/../../admin','radio%2Fanything'];
  for (const lang of ['zh','en','th']) {
    for (const base of ['/','/glfans/']) {
      const query = `?lang=${lang}&from=singlemessage&note=a%20b`;
      for (const route of hidden) {
        for (const href of [
          `https://glfans.com${base}${route}/${query}`,
          `https://glfans.com${base}cp/emibonnie/${query}#/${route}`,
        ]) {
          const url = normalizeShareUrl(href, base, true);
          assert.equal(url.origin, 'https://glfans.com', href);
          assert.equal(url.pathname, `${base}archive/`, href);
          assert.equal(url.hash, '#/archive', href);
          assert.equal(url.search, query, href);
          assert.equal(shareMetadataEndpoint(href, base), `${base}archive/share.json`, href);
        }
      }
      for (const hash of ['', '#/']) {
        const url = normalizeShareUrl(`https://glfans.com${base}${query}${hash}`, base, true);
        assert.equal(url.pathname, `${base}archive/`);
        assert.equal(url.hash, '#/archive');
        assert.equal(url.search, query);
      }
    }
  }
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
test('retained routes including reopened REPO and memes survive fragment removal in each locale and prefix', () => {
  for (const lang of ['zh','en','th']) {
    for (const base of ['/','/glfans/']) {
      for (const route of ['archive','archive/calendar','archive/2024/pluto','about','about/rights','cp','cp/emibonnie','column','column/us','column/us/unsaid-fragments-ep01','memes']) {
        const shared = normalizeShareUrl(`https://glfans.com${base}?lang=${lang}#/${route}`,base);
        shared.hash='';
        const opened=normalizeShareUrl(shared.href,base,true);
        assert.equal(opened.hash,`#/${route}`);
        assert.equal(opened.pathname,`${base}${route}/`);
        assert.equal(opened.search,`?lang=${lang}`);
        assert.equal(shareMetadataEndpoint(opened.href,base),`${base}${route}/share.json`);
      }
    }
  }
});

test('WeChat hidden routes retain the signed entry URL while using safe archive identity', () => {
  for (const lang of ['zh','en','th']) {
    for (const base of ['/','/glfans/']) {
      for (const route of ['radio','tide-words','admin']) {
        const entry = `https://glfans.com${base}${route}/?lang=${lang}&from=singlemessage`;
        for (const hash of ['', '#/tide-words', '#/']) {
          const url = normalizeDocumentUrl(`${entry}${hash}`, base, true, 'iPhone MicroMessenger');
          assert.equal(url.href.split('#')[0], entry);
          assert.equal(url.hash, '#/archive');
          assert.equal(shareMetadataEndpoint(url.href, base), `${base}archive/share.json`);
          assert.equal(normalizeShareUrl(url.href, base).pathname, `${base}archive/`);
        }
      }
    }
  }
});

test('WeChat bootstrap and hash switching keep the signed path/query stable on every client', () => {
  for (const ua of ['iPhone MicroMessenger', 'Android MicroMessenger', 'Macintosh MicroMessenger']) {
    const entry = 'https://glfans.com/cp/emibonnie/?lang=th&from=singlemessage&note=a%20b';
    const boot = normalizeDocumentUrl(entry, '/', true, ua);
    assert.equal(boot.href.split('#')[0], entry);
    assert.equal(boot.hash, '#/cp/emibonnie');
    const selected = normalizeDocumentUrl(`${entry}#/archive/2024/pluto`, '/', false, ua);
    assert.equal(selected.href.split('#')[0], entry);
    assert.equal(selected.hash, '#/archive/2024/pluto');
    assert.equal(shareMetadataEndpoint(selected.href), '/archive/2024/pluto/share.json');
    assert.equal(normalizeShareUrl(selected.href).pathname, '/archive/2024/pluto/');
    assert.equal(normalizeDocumentUrl(selected.href, '/', true, ua).hash, '#/archive/2024/pluto', 'refresh preserves the selected route');
  }
  const plain = normalizeDocumentUrl('https://glfans.com/?lang=zh#/cp/namtanfilm', '/', false, 'Chrome');
  assert.equal(plain.pathname, '/cp/namtanfilm/');
});

test('metadata endpoints follow hash identity, home reset and deployment prefix, not the entry path', () => {
  assert.equal(shareMetadataEndpoint('https://glfans.com/cp/emibonnie/#/cp/namtanfilm'), '/cp/namtanfilm/share.json');
  assert.equal(shareMetadataEndpoint('https://glfans.com/cp/emibonnie/#/'), '/archive/share.json');
  assert.equal(shareMetadataEndpoint('https://example.com/pit/cp/emibonnie/#/archive', '/pit/'), '/pit/archive/share.json');
});

test('metadata updates use current route, ignore stale fetches and reuse locale refresh data', async () => {
  const listeners = new Map(); const requests = new Map(); const seen = [];
  const tag = { setAttribute() {} };
  const host = {
    location: { href: 'https://glfans.com/cp/emibonnie/#/cp/emibonnie' },
    document: { title: '', head: { querySelector: () => tag, querySelectorAll: () => [] } },
    fetch: endpoint => new Promise(resolve => requests.set(endpoint, resolve)),
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: event => listeners.delete(event),
  };
  const stop = installShareMetadata(host, data => seen.push(data.url));
  host.location.href = 'https://glfans.com/cp/emibonnie/#/cp/namtanfilm';
  listeners.get('hashchange')();
  const response = cp => ({ ok: true, json: async () => ({ title: cp, description: cp, image: '/logo.jpg', url: `https://glfans.com/cp/${cp}/` }) });
  requests.get('/cp/namtanfilm/share.json')(response('namtanfilm'));
  await new Promise(resolve => setImmediate(resolve));
  requests.get('/cp/emibonnie/share.json')(response('emibonnie'));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(seen, ['https://glfans.com/cp/namtanfilm/']);
  assert.equal(host.document.title, 'namtanfilm');
  listeners.get('glfans:locale-changed')();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(seen, ['https://glfans.com/cp/namtanfilm/', 'https://glfans.com/cp/namtanfilm/']);
  assert.equal(requests.size, 2);
  stop(); assert.equal(listeners.size, 0);
});
