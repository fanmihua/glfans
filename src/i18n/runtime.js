import { editorial } from './editorial.js';
import { verifiedName } from './proper-names.js';
import { isWechatBrowser } from '../app/wechat-share.js';

export const LOCALES = ['zh', 'en', 'th'];
export const LANGUAGE_NAMES = { zh: '中文', en: 'English', th: 'ไทย' };
const subscribers = new Set();
const dictionaries = { zh: {}, en: {}, th: {} };
const resources = new Map();
let patterns = { en: [], th: [] };

export function readPreferredLocale() {
  if (typeof window === 'undefined') return 'zh';
  const query = new URL(window.location.href).searchParams.get('lang');
  if (LOCALES.includes(query)) return query;
  try {
    const saved = window.localStorage.getItem('glfans:locale');
    return LOCALES.includes(saved) ? saved : 'zh';
  } catch { return 'zh'; }
}

let locale = readPreferredLocale();
export const getLocale = () => locale;
export const subscribeLocale = (listener) => { subscribers.add(listener); return () => subscribers.delete(listener); };
export const getDateLocale = () => ({ zh: 'zh-CN', en: 'en-GB', th: 'th-TH-u-ca-gregory' })[locale];

const loaders = {
  'en-ui': () => import('./en-ui.json'), 'th-ui': () => import('./th-ui.json'),
  'en-archive': () => import('./en-archive.json'), 'th-archive': () => import('./th-archive.json'),
};

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function registerCatalog(target, catalog) {
  Object.assign(dictionaries[target], Object.fromEntries(Object.entries(catalog).map(([key, value]) => [normalize(key), value])));
  patterns[target] = Object.entries({ ...dictionaries[target], ...editorial[target] })
    .filter(([key]) => /\{\d+\}/.test(key))
    .map(([key, value]) => {
      const ids = [...key.matchAll(/\{(\d+)\}/g)].map(match => match[1]);
      const parts = key.split(/\{\d+\}/).map(escape);
      return { regex: new RegExp(`^${parts.join('(.*?)')}$`, 'u'), ids, value, specificity: parts.join('').length };
    }).sort((a, b) => b.specificity - a.specificity || a.ids.length - b.ids.length);
}

export function translate(value, target = locale, substitutions) {
  if (typeof value !== 'string') return value;
  if (target === 'zh') return substitutions ? value.replace(/\{(\d+)\}/g, (_, index) => substitutions[index] ?? '') : value;
  const source = normalize(value);
  const translated = verifiedName(source, target) ?? editorial[target][source] ?? dictionaries[target][source];
  const whitespace = value.match(/^(\s*)[\s\S]*?(\s*)$/);
  const withSpace = (text) => `${whitespace[1]}${text}${whitespace[2]}`;
  if (translated !== undefined) return withSpace(substitutions ? translated.replace(/\{(\d+)\}/g, (_, index) => substitutions[index] ?? '') : translated);
  for (const pattern of patterns[target]) {
    const match = source.match(pattern.regex);
    if (!match) continue;
    const slots = Object.fromEntries(pattern.ids.map((id, i) => [id, match[i + 1]]));
    return withSpace(pattern.value.replace(/\{(\d+)\}/g, (_, id) => slots[id] ?? ''));
  }
  return substitutions ? value.replace(/\{(\d+)\}/g, (_, index) => substitutions[index] ?? '') : value;
}

export const t = (value, substitutions) => translate(value, locale, substitutions);

export function reactionLabel(liked, likes, target = locale) {
  const action = translate(liked ? '取消心动' : '送出心动', target);
  return translate(likes == null ? '{0}，统计加载中' : '{0}，当前 {1} 次', target, [action, likes]);
}

export function trackCount(count) {
  if (locale === 'zh') return `${count} 首歌`;
  return locale === 'en' ? `${count} ${count === 1 ? 'track' : 'tracks'}` : `${count} เพลง`;
}

export function loadCatalog(target, kind = 'ui') {
  if (target === 'zh') return Promise.resolve();
  const key = `${target}-${kind}`;
  const existing = resources.get(key);
  if (existing) return existing.promise;
  const resource = { ready: false, error: null };
  resource.promise = loaders[key]().then(async module => {
    if (target === 'th' && kind === 'ui') {
      await import('@fontsource-variable/noto-sans-thai');
      if (typeof document !== 'undefined') await document.fonts?.load('16px "Noto Sans Thai Variable"', 'ภาษาไทย');
    }
    registerCatalog(target, module.default);
    resource.ready = true;
  }).catch(error => { resource.error = error; resources.delete(key); throw error; });
  resources.set(key, resource);
  return resource.promise;
}

export function requireCatalog(kind = 'ui') {
  if (locale === 'zh') return;
  const resource = resources.get(`${locale}-${kind}`);
  if (resource?.ready) return;
  if (resource?.error) throw resource.error;
  throw loadCatalog(locale, kind);
}

export function activeCatalogKinds() {
  if (typeof window === 'undefined') return ['ui'];
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  return ['ui', ...(parts[0] === 'archive' ? ['archive'] : [])];
}

function applyDocumentLocale() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
  document.documentElement.dataset.locale = locale;
  document.title = { zh: 'glfans — 这次真的不一样', en: 'glfans — This time is different', th: 'glfans — ครั้งนี้ไม่เหมือนเดิม' }[locale];
  if (isWechatBrowser(window.navigator?.userAgent)) window.dispatchEvent(new Event('glfans:locale-changed'));
}

export async function initializeLocale() {
  try { await Promise.all(activeCatalogKinds().map(kind => loadCatalog(locale, kind))); }
  catch { locale = 'zh'; }
  applyDocumentLocale();
}

let switchRequest = 0;
export async function changeLocale(next) {
  if (!LOCALES.includes(next)) return;
  const request = ++switchRequest;
  await Promise.all(activeCatalogKinds().map(kind => loadCatalog(next, kind)));
  if (request !== switchRequest) return;
  locale = next;
  if (isWechatBrowser(window.navigator?.userAgent)) document.documentElement.dataset.localeChanged = 'true';
  try { window.localStorage.setItem('glfans:locale', locale); } catch { /* Private browsing may deny persistence. */ }
  // Changing a signed WeChat document's query invalidates its JS-SDK context.
  // The actual locale stays in app state/storage and in the outgoing share URL.
  if (!isWechatBrowser(window.navigator?.userAgent)) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    window.history.replaceState(window.history.state, '', url);
  }
  applyDocumentLocale();
  subscribers.forEach(listener => listener());
}
