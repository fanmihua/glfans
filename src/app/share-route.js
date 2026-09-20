import { isWechatBrowser } from './wechat-share.js';

// Keep shared page identity outside the fragment: preview crawlers do not receive #.
// The fragment remains the internal router's source of truth after bootstrap.
const publicRoute = /^(?:cp|archive|column|memes|radio|tide-words|about|admin)(?:\/[a-z0-9-]+)*\/?$/;
export function normalizeShareUrl(href, base = '/', bootstrap = false) {
  const url = new URL(href);
  const prefix = `/${base.replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
  const root = `${prefix}/`;
  const path = url.pathname.startsWith(root) ? url.pathname.slice(root.length) : '';
  const fromPath = publicRoute.test(path);
  if (bootstrap && !url.hash && fromPath) url.hash = `#/${path.replace(/\/$/, '')}`;
  const route = url.hash.replace(/^#\//, '').replace(/\/$/, '');
  const fromHash = publicRoute.test(route);
  if (fromHash) url.pathname = `${root}${route}/`;
  else if (fromPath) url.pathname = root;
  return url;
}

export function normalizeDocumentUrl(href, base = '/', bootstrap = false, userAgent = '') {
  const normalized = normalizeShareUrl(href, base, bootstrap);
  if (!isWechatBrowser(userAgent)) return normalized;
  // WeChat signs the entry document, not every in-page destination. Keep its
  // pathname/query stable while still bootstrapping public deep links.
  const documentUrl = new URL(href);
  documentUrl.hash = normalized.hash;
  return documentUrl;
}

export function shareMetadataEndpoint(href, base = '/') {
  return `${normalizeShareUrl(href, base, true).pathname}share.json`;
}

export function installShareMetadata(host = window, onMetadata = () => {}, base = '/') {
  let revision = 0;
  const cache = new Map();
  const update = async () => {
    const current = ++revision;
    const endpoint = shareMetadataEndpoint(host.location.href, base);
    try {
      let data = cache.get(endpoint);
      if (!data) {
        const response = await host.fetch(endpoint);
        if (!response.ok) throw new Error('Share metadata unavailable');
        data = await response.json(); cache.set(endpoint, data);
      }
      if (revision !== current) return;
      const doc = host.document;
      doc.title = data.title;
      for (const [name,value] of Object.entries({'og:title':data.title,'og:description':data.description,'og:url':data.url,'og:image':data.image,'og:image:alt':data.title,'twitter:title':data.title,'twitter:description':data.description,'twitter:image':data.image})) {
        const selector = name.startsWith('og:') ? 'property' : 'name';
        let tag = doc.head.querySelector(`meta[${selector}="${name}"]`);
        if (!tag) {tag = doc.createElement('meta'); tag.setAttribute(selector,name); doc.head.appendChild(tag);}
        tag.setAttribute('content',value);
      }
      doc.head.querySelector('meta[name="description"]')?.setAttribute('content',data.description);
      doc.head.querySelector('link[rel="canonical"]')?.setAttribute('href',data.url);
      onMetadata(data);
    } catch {
      if (revision !== current) return;
      // Unknown pages must never retain the previous CP's preview or canonical.
      host.document.head.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"]').forEach(tag=>tag.remove());
    }
  };
  update();
  host.addEventListener('hashchange', update);
  host.addEventListener('popstate', update);
  host.addEventListener('glfans:route-ready', update);
  host.addEventListener('glfans:locale-changed', update);
  return () => {revision++; host.removeEventListener('hashchange',update); host.removeEventListener('popstate',update); host.removeEventListener('glfans:route-ready',update); host.removeEventListener('glfans:locale-changed',update);};
}

export function installShareRoutes(host = window, base = '/') {
  const sync = (bootstrap = false) => {
    const next = normalizeDocumentUrl(host.location.href, base, bootstrap, host.navigator?.userAgent);
    if (next.href !== host.location.href) host.history.replaceState(host.history.state, '', next.href);
  };
  sync(true);
  const update = () => sync(false);
  host.addEventListener('hashchange', update);
  host.addEventListener('popstate', update);
  return () => {
    host.removeEventListener('hashchange', update);
    host.removeEventListener('popstate', update);
  };
}
