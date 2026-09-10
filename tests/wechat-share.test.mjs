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
test('iOS signs initial document URL; Android signs current route',()=>{
  assert.equal(wechatSigningUrl('https://glfans.com/?lang=zh#/cp/a','https://glfans.com/cp/b/#/cp/b','iPhone MicroMessenger'),'https://glfans.com/?lang=zh');
  assert.equal(wechatSigningUrl('https://glfans.com/','https://glfans.com/cp/b/#/cp/b','Android MicroMessenger'),'https://glfans.com/cp/b/');
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
  assert.equal(calls[0].desc,'EmiBonnie'); assert.equal(host.document.documentElement.dataset.wechatShare,'configured');
});
