import { AppError } from './errors.js';

export function validateWechatUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new AppError(400,'wechat_url_invalid','分享地址不正确。'); }
  if (typeof value !== 'string' || value.length > 2048 || url.protocol !== 'https:' ||
      !['glfans.com','www.glfans.com'].includes(url.hostname) || url.port || url.username || url.password || url.hash) {
    throw new AppError(400,'wechat_url_invalid','只能为本站 HTTPS 页面生成分享签名。');
  }
  return value; // Sign exact browser bytes, not a reordered/normalized query.
}

export function createWechatSigner(fetcher = fetch) {
  const cache = new Map();
  return async value => {
    const url = validateWechatUrl(value);
    const cached = cache.get(url);
    if (cached && cached.until > Date.now()) return cached.promise;
    const promise = (async () => {
      // Reuse FanStudio's cached official-account ticket; never copy secrets or
      // independently refresh its access_token and disrupt the existing site.
      const response = await fetcher(`https://fanstudio.cn/api/wechat/jssdk-signature?url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(8000), redirect:'error',
      });
      const data = await response.json();
      if (!response.ok || !/^wx[a-z0-9]+$/i.test(data.appId || '') || !/^[a-f0-9]{40}$/i.test(data.signature || '') ||
          !/^[a-f0-9]{32}$/i.test(data.nonceStr || '') || !Number.isSafeInteger(Number(data.timestamp))) {
        throw new Error('Signer unavailable');
      }
      return {appId:data.appId,timestamp:Number(data.timestamp),nonceStr:data.nonceStr,signature:data.signature};
    })().catch(() => {cache.delete(url); throw new AppError(502,'wechat_sign_unavailable','微信分享暂时不可用，请稍后重试。');});
    if(cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(url,{promise,until:Date.now()+300000});
    return promise;
  };
}
