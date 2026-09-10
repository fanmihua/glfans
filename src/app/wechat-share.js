const MODERN_APIS = ['updateAppMessageShareData', 'updateTimelineShareData'];
const LEGACY_APIS = ['onMenuShareAppMessage', 'onMenuShareTimeline'];

export function isWechatBrowser(userAgent = '') {
  return /MicroMessenger/i.test(userAgent);
}

export function wechatSigningUrl(entryUrl) {
  // All clients keep this document's path/query stable; only the hash can change.
  // The share target is independently derived from the current internal route.
  return entryUrl.split('#')[0];
}

function legacySupport(wx, host, api) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      host.clearTimeout(timer);
      if (error) reject(error); else resolve(value);
    };
    const timer = host.setTimeout(() => finish(new Error('WeChat share API check timeout')), 10000);
    if (!wx.checkJsApi) return finish(new Error('WeChat share API check unavailable'));
    wx.checkJsApi({
      jsApiList: [api],
      success: result => {
        try {
          const support = typeof result.checkResult === 'string' ? JSON.parse(result.checkResult) : result.checkResult;
          if (support?.[api] !== true || typeof wx[api] !== 'function') throw new Error('WeChat share API support not confirmed');
          finish(null, api);
        } catch (error) { finish(error); }
      },
      fail: () => finish(new Error('WeChat share API check rejected')),
    });
  });
}

export function createWechatSharing(host = window, entryUrl = host.location.href, options = {}) {
  if (!isWechatBrowser(host.navigator.userAgent)) return () => {};
  const mode = options.mode ?? 'auto';
  if (!['auto', 'modern', 'legacy'].includes(mode)) throw new Error('Unknown WeChat share mode');
  const signingUrl = wechatSigningUrl(entryUrl);
  let sdkPromise;
  let configurationPromise;
  let configStarted = false;
  let revision = 0;
  let queue = Promise.resolve();
  const sdk = () => sdkPromise ||= new Promise((resolve, reject) => {
    if (host.wx) return resolve(host.wx);
    const script = host.document.createElement('script');
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.async = true;
    script.onload = () => host.wx ? resolve(host.wx) : reject(new Error('SDK unavailable'));
    script.onerror = () => reject(new Error('SDK download failed'));
    host.document.head.appendChild(script);
  }).catch(error => { sdkPromise = null; throw error; });

  const configure = () => configurationPromise ||= (async () => {
    const wx = await sdk();
    const response = await host.fetch(`/api/wechat/jssdk-signature?url=${encodeURIComponent(signingUrl)}`);
    if (!response.ok) throw new Error('Signature unavailable');
    const signature = await response.json();
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        host.clearTimeout(timer);
        if (error) reject(error); else resolve();
      };
      const timer = host.setTimeout(() => finish(new Error('WeChat configuration timeout')), 10000);
      wx.error(error => finish(new Error(error?.errMsg || 'WeChat configuration rejected')));
      // jweixin's ready state is sticky across config calls. Configure once per
      // document, then update metadata without re-signing on route changes.
      configStarted = true;
      wx.config({ ...signature, debug: false, jsApiList: ['checkJsApi', ...MODERN_APIS, ...LEGACY_APIS] });
      wx.ready(() => finish());
    });
    return wx;
  })().catch(error => {
    // A download/network failure before config is retryable. A rejected config
    // must not reuse the SDK's previous ready state; a fresh document can retry.
    if (!configStarted) configurationPromise = null;
    throw error;
  });

  return data => {
    const current = ++revision;
    const state = host.document.documentElement.dataset;
    state.wechatShare = 'loading';
    queue = queue.catch(() => {}).then(async () => {
      if (current !== revision) return;
      const wx = await configure();
      if (current !== revision) return;
      const link = new URL(data.url);
      const lang = state.locale || new URL(host.location.href).searchParams.get('lang');
      const entryLanguage = new URL(entryUrl).searchParams.get('lang');
      if (['zh', 'en', 'th'].includes(lang) && (lang !== 'zh' || entryLanguage || state.localeChanged === 'true')) link.searchParams.set('lang', lang);
      const share = { title: data.title, desc: data.description, link: link.href, imgUrl: data.image };
      const fail = error => {
        if (current !== revision) return;
        state.wechatShare = 'error';
        host.console.warn('glfans WeChat share:', error?.errMsg || 'Share registration rejected');
      };
      state.wechatShare = 'metadata-registered';
      const registerLegacy = index => legacySupport(wx, host, LEGACY_APIS[index]).then(api => {
        if (current === revision) wx[api]({ ...share, fail });
      }).catch(error => fail({ errMsg: error.message }));
      MODERN_APIS.forEach((api, index) => {
        if (mode === 'legacy') { registerLegacy(index); return; }
        if (typeof wx[api] !== 'function') {
          if (mode === 'auto') registerLegacy(index);
          else fail({ errMsg: 'Modern WeChat sharing unavailable' });
          return;
        }
        wx[api]({ ...share, fail: error => {
          if (current !== revision) return;
          // Capability checks have false negatives on some desktop clients.
          // Try the documented modern API first. Only its explicit unsupported
          // response permits capability-checked legacy fallback, not denial,
          // a missing callback, or a general error.
          if (mode === 'auto' && /(?:not[ _-]?support(?:ed)?|not[ _-]?exist|function_not_exist)/i.test(error?.errMsg || '')) registerLegacy(index);
          else fail(error);
        }, ...(api === 'updateAppMessageShareData' ? {
          success: () => {
            if (current === revision && state.wechatShare !== 'error') state.wechatShare = 'metadata-confirmed';
          },
        } : {}) });
      });
      // metadata-confirmed only acknowledges configuration, never a sent card.
    }).catch(error => {
      if (current !== revision) return;
      state.wechatShare = 'error';
      host.console.warn('glfans WeChat share:', error.message);
    });
    return queue;
  };
}
