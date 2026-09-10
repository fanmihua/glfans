import test from 'node:test';
import assert from 'node:assert/strict';
import {createWechatSigner,validateWechatUrl} from '../server/wechat-share.js';
import {wechatSigningUrl,createWechatSharing} from '../src/app/wechat-share.js';
test('signing rejects foreign hosts, credentials, fragments and non-HTTPS',()=>{
  for(const url of ['https://evil.test/','https://glfans.com.evil.test/','http://glfans.com/','https://u:p@glfans.com/','https://glfans.com/#/cp']) assert.throws(()=>validateWechatUrl(url));
  const exact='https://glfans.com/cp/emibonnie/?lang=zh&from=singlemessage';
  assert.equal(validateWechatUrl(exact),exact);
});
test('signer reuses cached FanStudio response and strips unexpected fields',async()=>{
  let calls=0;
  const sign=createWechatSigner(async url=>{calls++;assert.ok(url.startsWith('https://fanstudio.cn/api/wechat/jssdk-signature?url='));return {ok:true,json:async()=>({appId:'wx123',timestamp:123,signature:'a'.repeat(40),nonceStr:'b'.repeat(32),secret:'must-not-leak'})};});
  const results=await Promise.all([sign('https://glfans.com/'),sign('https://glfans.com/')]);
  assert.equal(calls,1); assert.equal(results[0].secret,undefined);
});
test('upstream errors do not expose upstream messages or remain cached',async()=>{
  let calls=0;const sign=createWechatSigner(async()=>{calls++;throw Error('sensitive');});
  for(let i=0;i<2;i++) await assert.rejects(sign('https://glfans.com/'),error=>!error.message.includes('sensitive'));
  assert.equal(calls,2);
});
test('every WeChat client signs the stable entry document URL, never its hash',()=>{
  assert.equal(wechatSigningUrl('https://glfans.com/?lang=zh#/cp/a','https://glfans.com/cp/b/#/cp/b','iPhone MicroMessenger'),'https://glfans.com/?lang=zh');
  assert.equal(wechatSigningUrl('https://glfans.com/','https://glfans.com/cp/b/#/cp/b','Android MicroMessenger'),'https://glfans.com/');
});
test('ordinary browsers never load WeChat resources',()=>{
  const update=createWechatSharing({navigator:{userAgent:'Chrome'},location:{href:'https://glfans.com/'}});
  assert.equal(update({}),undefined);
});
test('WeChat config installs logo, current title, description and language-specific deep link',async()=>{
  let ready;const calls=[];
  const host={navigator:{userAgent:'iPhone MicroMessenger'},location:{href:'https://glfans.com/cp/emibonnie/?lang=zh#/cp/emibonnie'},document:{documentElement:{dataset:{}}},setTimeout,clearTimeout,console,
    fetch:async()=>({ok:true,json:async()=>({appId:'wx123',signature:'sig'})}),
    wx:{ready:fn=>{ready=fn;},error:()=>{},config:()=>queueMicrotask(()=>ready()),updateAppMessageShareData:data=>calls.push(data),updateTimelineShareData:()=>{}}};
  await createWechatSharing(host)({title:'glfans · 百家饭',description:'EmiBonnie',image:'https://glfans.com/logo.jpg',url:'https://glfans.com/cp/emibonnie/'});
  assert.equal(calls[0].link,'https://glfans.com/cp/emibonnie/?lang=zh');
  assert.equal(calls[0].desc,'EmiBonnie'); assert.equal(host.document.documentElement.dataset.wechatShare,'metadata-registered');
});

const metadata = (cp = 'emibonnie') => ({ title: 'glfans · 百家饭', description: cp, image: 'https://glfans.com/logo.jpg', url: `https://glfans.com/cp/${cp}/` });
const tick = () => new Promise(resolve => setImmediate(resolve));

function stickyWechat({ href = 'https://glfans.com/cp/emibonnie/', locale = 'zh', support, configError } = {}) {
  let readyState = 0;
  const readyCallbacks = [];
  const calls = { config: [], signature: [], share: [], checks: [], warnings: [] };
  let errorCallback;
  const host = {
    navigator: { userAgent: 'Macintosh MicroMessenger' }, location: { href },
    document: { documentElement: { dataset: { locale } } }, setTimeout, clearTimeout,
    console: { warn: (...args) => calls.warnings.push(args) },
    fetch: async url => { calls.signature.push(url); return { ok: true, json: async () => ({ appId: 'wx123', signature: 'sig' }) }; },
    wx: {
      // Match the SDK's real sticky behavior: config never resets readyState.
      ready(fn) { if (readyState) fn(); else readyCallbacks.push(fn); },
      error(fn) { errorCallback = fn; },
      config(data) {
        calls.config.push(data);
        queueMicrotask(() => {
          readyState = 1;
          if (configError) errorCallback({ errMsg: configError });
          readyCallbacks.splice(0).forEach(fn => fn());
        });
      },
      checkJsApi(data) {
        calls.checks.push(data);
        data.success({ checkResult: support ?? { onMenuShareAppMessage: true, onMenuShareTimeline: true } });
      },
    },
  };
  for (const api of ['updateAppMessageShareData', 'updateTimelineShareData', 'onMenuShareAppMessage', 'onMenuShareTimeline']) {
    host.wx[api] = data => calls.share.push({ api, data });
  }
  return { host, calls };
}

test('sticky SDK is configured once while route and locale metadata keep updating', async () => {
  const { host, calls } = stickyWechat();
  const update = createWechatSharing(host);
  await update(metadata());
  assert.equal(calls.share[0].data.link, 'https://glfans.com/cp/emibonnie/');
  host.location.href += '#/cp/namtanfilm';
  await update(metadata('namtanfilm'));
  host.document.documentElement.dataset.locale = 'en';
  host.document.documentElement.dataset.localeChanged = 'true';
  await update(metadata('namtanfilm'));
  assert.equal(calls.config.length, 1);
  assert.equal(calls.signature.length, 1);
  assert.equal(new URL(calls.signature[0], 'https://glfans.com').searchParams.get('url'), 'https://glfans.com/cp/emibonnie/');
  assert.deepEqual(calls.share.filter(call => call.api === 'updateAppMessageShareData').map(call => call.data.link), [
    'https://glfans.com/cp/emibonnie/', 'https://glfans.com/cp/namtanfilm/', 'https://glfans.com/cp/namtanfilm/?lang=en',
  ]);
  assert.ok(calls.share.every(call => call.api.startsWith('update')));
  assert.equal(calls.checks.length, 0, 'do not let capability-check false negatives preempt modern sharing');
});

test('metadata acknowledgement is not share success, and stale callbacks cannot overwrite current state', async () => {
  const { host, calls } = stickyWechat();
  const update = createWechatSharing(host);
  await update(metadata());
  assert.equal(host.document.documentElement.dataset.wechatShare, 'metadata-registered');
  const oldShare = calls.share[0].data;
  oldShare.success();
  assert.equal(host.document.documentElement.dataset.wechatShare, 'metadata-confirmed');
  await update(metadata('namtanfilm'));
  oldShare.success(); oldShare.fail({ errMsg: 'old failure' });
  assert.equal(host.document.documentElement.dataset.wechatShare, 'metadata-registered');
  assert.equal(calls.warnings.length, 0);
  assert.equal(calls.share[3].data.success, undefined, 'timeline callbacks cannot confirm friend metadata');
});

test('updates received while signing skip stale metadata without a second config', async () => {
  const { host, calls } = stickyWechat();
  let signatureResolve;
  host.fetch = () => new Promise(resolve => { signatureResolve = resolve; });
  const update = createWechatSharing(host);
  const first = update(metadata());
  await tick();
  const second = update(metadata('namtanfilm'));
  signatureResolve({ ok: true, json: async () => ({ appId: 'wx123', signature: 'sig' }) });
  await Promise.all([first, second]);
  assert.equal(calls.config.length, 1);
  assert.equal(calls.share.length, 2);
  assert.ok(calls.share.every(call => call.data.desc === 'namtanfilm'));
});

test('failed configuration cannot become ready or silently retry using sticky state', async () => {
  const { host, calls } = stickyWechat({ configError: 'config:invalid signature' });
  const update = createWechatSharing(host);
  await update(metadata());
  await update(metadata('namtanfilm'));
  assert.equal(calls.config.length, 1);
  assert.equal(calls.share.length, 0);
  assert.equal(host.document.documentElement.dataset.wechatShare, 'error');
});

test('explicit modern unsupported response permits capability-checked legacy fallback only for that channel', async () => {
  const { host, calls } = stickyWechat();
  await createWechatSharing(host)(metadata());
  calls.share[0].data.fail({ errMsg: 'updateAppMessageShareData:fail not supported' });
  await tick();
  assert.deepEqual(calls.share.map(call => call.api), ['updateAppMessageShareData', 'updateTimelineShareData', 'onMenuShareAppMessage']);
  assert.equal(calls.share[2].data.success, undefined, 'legacy send callback is not a registration acknowledgement');
  assert.equal(host.document.documentElement.dataset.wechatShare, 'metadata-registered');
});

test('permission denial, unsupported legacy and timed-out capability checks do not fake success', async () => {
  const denied = stickyWechat();
  await createWechatSharing(denied.host)(metadata());
  denied.calls.share[0].data.fail({ errMsg: 'permission denied' });
  await tick();
  assert.equal(denied.calls.checks.length, 0);
  assert.equal(denied.host.document.documentElement.dataset.wechatShare, 'error');

  const unsupported = stickyWechat({ support: { onMenuShareAppMessage: false } });
  await createWechatSharing(unsupported.host)(metadata());
  unsupported.calls.share[0].data.fail({ errMsg: 'not supported' });
  await tick();
  assert.equal(unsupported.calls.share.length, 2);
  assert.equal(unsupported.host.document.documentElement.dataset.wechatShare, 'error');

  const timed = stickyWechat();
  const timers = new Map(); let timerId = 0;
  timed.host.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  timed.host.clearTimeout = id => timers.delete(id);
  timed.host.wx.checkJsApi = () => {};
  await createWechatSharing(timed.host)(metadata());
  timed.calls.share[0].data.fail({ errMsg: 'not supported' });
  [...timers.values()].forEach(fn => fn());
  await tick();
  assert.equal(timed.calls.share.length, 2);
  assert.equal(timed.host.document.documentElement.dataset.wechatShare, 'error');
});

test('explicit modes do not register both modern and legacy channels', async () => {
  const modern = stickyWechat();
  await createWechatSharing(modern.host, modern.host.location.href, { mode: 'modern' })(metadata());
  modern.calls.share[0].data.fail({ errMsg: 'not supported' });
  await tick();
  assert.equal(modern.calls.checks.length, 0);
  assert.equal(modern.calls.share.length, 2);
  const legacy = stickyWechat();
  await createWechatSharing(legacy.host, legacy.host.location.href, { mode: 'legacy' })(metadata());
  await tick();
  assert.deepEqual(legacy.calls.share.map(call => call.api), ['onMenuShareAppMessage', 'onMenuShareTimeline']);
  assert.equal(legacy.host.document.documentElement.dataset.wechatShare, 'metadata-registered');
});
