// Test-only HTTP origin: gzip, 150 ms request latency, shared 1.6 Mbps budget.
// No production files are changed. Do not use as the deployment server.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = resolve(process.argv[2] || 'dist/client');
const port = Number(process.argv[3] || 4176);
const failOnce = process.argv[4];
let failureSent = false;
const queue = [];
setInterval(() => {
  let budget = 20000;
  for (let i = 0; queue.length && budget > 0; i++) {
    const job = queue.shift();
    if (job.res.destroyed) continue;
    const count = Math.min(4096, budget, job.data.length - job.offset);
    job.res.write(job.data.subarray(job.offset, job.offset + count));
    job.offset += count; budget -= count;
    if (job.offset === job.data.length) job.res.end(); else queue.push(job);
  }
}, 100).unref();
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (failOnce && !failureSent && pathname.includes(failOnce)) {
      failureSent = true; res.writeHead(503, {'Content-Type':'text/plain','Cache-Control':'no-store'}).end('Test-only first-request failure'); return;
    }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let data = await readFile(file);
    const ext = extname(file);
    if (ext === '.html') data = Buffer.from(data.toString().replace('<head>', `<head><script>window.__cpMetrics={lcp:0,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__cpMetrics.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cpMetrics.cls+=e.value}).observe({type:'layout-shift',buffered:true});</script>`));
    const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png', '.woff2':'font/woff2' };
    const compressed = ['.html','.js','.css','.json'].includes(ext);
    if (compressed) data = gzipSync(data);
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control':'no-store', 'Content-Length':data.length, ...(compressed ? {'Content-Encoding':'gzip'} : {}) });
      queue.push({ res, data, offset:0 });
    }, 150);
  } catch { res.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Slow 4G test origin http://localhost:${port}: 150ms/request, 200000 bytes/sec shared, cache disabled`));
