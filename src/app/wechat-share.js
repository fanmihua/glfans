export function wechatSigningUrl(entryUrl, currentUrl, userAgent) {
  return (/iPhone|iPad|iPod/i.test(userAgent) ? entryUrl : currentUrl).split('#')[0];
}

export function createWechatSharing(host = window, entryUrl = host.location.href) {
  if (!/MicroMessenger/i.test(host.navigator.userAgent)) return () => {};
  let sdkPromise;
  let revision=0;
  let queue=Promise.resolve();
  const signatures = new Map();
  const sdk = () => sdkPromise ||= new Promise((resolve,reject) => {
    if(host.wx) return resolve(host.wx);
    const script=host.document.createElement('script');
    script.src='https://res.wx.qq.com/open/js/jweixin-1.6.0.js'; script.async=true;
    script.onload=()=>host.wx ? resolve(host.wx) : reject(new Error('SDK unavailable'));
    script.onerror=()=>reject(new Error('SDK download failed'));
    host.document.head.appendChild(script);
  }).catch(error=>{sdkPromise=null; throw error;});
  return data => {
    const current=++revision;
    host.document.documentElement.dataset.wechatShare='loading';
    queue=queue.catch(()=>{}).then(async()=>{
      if(current!==revision) return;
      const wx=await sdk();
      const url=wechatSigningUrl(entryUrl,host.location.href,host.navigator.userAgent);
      let cached=signatures.get(url);
      if(!cached || cached.until<Date.now()) {
        const response=await host.fetch(`/api/wechat/jssdk-signature?url=${encodeURIComponent(url)}`);
        if(!response.ok) throw new Error('Signature unavailable');
        cached={data:await response.json(),until:Date.now()+240000};
        if(signatures.size>=50) signatures.clear();
        signatures.set(url,cached);
      }
      if(current!==revision) return;
      await new Promise((resolve,reject)=>{
        const timer=host.setTimeout(()=>reject(new Error('WeChat configuration timeout')),10000);
        wx.config({...cached.data,debug:false,jsApiList:['updateAppMessageShareData','updateTimelineShareData','onMenuShareAppMessage','onMenuShareTimeline']});
        wx.ready(()=>{host.clearTimeout(timer); resolve();});
        wx.error(error=>{host.clearTimeout(timer); reject(new Error(error?.errMsg || 'WeChat configuration rejected'));});
      });
      if(current!==revision) return;
      const link=new URL(data.url);
      const lang=new URL(host.location.href).searchParams.get('lang');
      if(['zh','en','th'].includes(lang)) link.searchParams.set('lang',lang);
      const share={title:data.title,desc:data.description,link:link.href,imgUrl:data.image,fail:error=>{
        if(current!==revision) return;
        host.document.documentElement.dataset.wechatShare='error';
        host.console.warn('glfans WeChat share:',error?.errMsg || 'Share registration rejected');
      }};
      host.document.documentElement.dataset.wechatShare='configured';
      wx.updateAppMessageShareData?.(share);
      wx.updateTimelineShareData?.(share);
      wx.onMenuShareAppMessage?.(share);
      wx.onMenuShareTimeline?.(share);
    }).catch(error=>{
      if(current!==revision) return;
      host.document.documentElement.dataset.wechatShare='error';
      host.console.warn('glfans WeChat share:',error.message);
    });
    return queue;
  };
}
