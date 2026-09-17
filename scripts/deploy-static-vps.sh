#!/usr/bin/env bash
set -euo pipefail

# 保持单文件入口，服务器只需现有 Node，不依赖 checkout/node_modules。
node --input-type=module - "${1:-dist/client}" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const input = process.argv[2];
const maintenance = input === '--deduplicate';
const root = process.env.GLFANS_SITE_ROOT || '/var/www/glfans';
const id = process.env.GLFANS_RELEASE_ID || `${new Date().toISOString().replace(/[-:.]/g, '')}-${process.pid}`;
if (!path.isAbsolute(root) || path.resolve(root) === '/' || path.resolve(root) !== root) throw Error('Use a specific normalized absolute GLFANS_SITE_ROOT');
if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw Error('Unsafe release ID');
const releases = path.join(root, 'releases');
const release = path.join(releases, id);
const shared = path.join(root, 'shared/assets');
const blobs = path.join(root, 'shared/blobs');
const current = path.join(root, 'current');
const marker = path.join(root, 'shared/.assets-initialized-v1');
const filingMode = process.env.GLFANS_FILING_MODE || '0';
if (!['0', '1'].includes(filingMode)) throw Error('GLFANS_FILING_MODE must be 0 or 1');
const filingPolicy = path.join(root, 'shared/filing-policy.conf');
const nginxConfig = process.env.GLFANS_NGINX_CONFIG || '/etc/nginx/sites-available/glfans.com.conf';
const ignored = name => name === '.DS_Store' || name.startsWith('._') || name.startsWith('.glfans-asset-');
const exists = name => { try { fs.lstatSync(name); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };

// 所有受控目录禁止软链接，避免写入其他站点；current 是唯一允许的软链接。
function directory(dir) {
  if (exists(dir)) {
    if (!fs.lstatSync(dir).isDirectory()) throw Error(`Not a real directory: ${dir}`);
    return;
  }
  directory(path.dirname(dir));
  fs.mkdirSync(dir, { mode: 0o755 });
}
function files(dir) {
  if (!fs.lstatSync(dir).isDirectory()) throw Error(`Not a real directory: ${dir}`);
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored(entry.name)) continue;
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...files(name));
    else if (entry.isFile()) result.push(name);
    else throw Error(`Refusing symbolic link or special file: ${name}`);
  }
  return result;
}
function activeRelease() {
  if (!exists(current)) return null;
  if (!fs.lstatSync(current).isSymbolicLink()) throw Error('current must be a symbolic link');
  const target = fs.realpathSync(current);
  if (path.dirname(target) !== fs.realpathSync(releases) || !fs.lstatSync(target).isDirectory()) throw Error('current points outside releases');
  return target;
}

// server 级 return 在 location 匹配前执行，旧 /api/、/assets/ 的 ^~ 不能绕过。
// 保留健康检查与微信分享签名；所有社区读写接口统一关闭，API 进程及数据库保持。
const filingRules = [
  '^/api(?:/(?!health$|wechat/jssdk-signature$)|$)',
  '^/(?:home|column|memes|radio|tide-words|admin|polaroid-lab)(?:/|$)',
  '^/assets/(?:column|fan-memes|meme-game|pit-radio)(?:/|$)',
  '^/assets/(?:HomePage|AdminPage|ArticlePage|Column|MemesPage|PitRadioPage|RepoFilmStrip|WordsTideLab|Polaroid[^/]*|(?:en|th)-articles?|community-api)-[^/]+\\.(?:m?js|css)(?:\\.map)?$',
];
const filingContents = '# glfans filing visibility policy v1; restore only by an explicit release.\n' +
  filingRules.map(rule => `if ($uri ~* "${rule}") { return 404; }`).join('\n') + '\n';

function atomicWrite(name, bytes, mode = 0o644) {
  const temp = path.join(path.dirname(name), `.glfans-asset-${randomUUID()}`);
  try {
    fs.writeFileSync(temp, bytes, { flag: 'wx', mode });
    fs.renameSync(temp, name);
  } finally { if (exists(temp)) fs.unlinkSync(temp); }
}
function snapshot(name) {
  if (!exists(name)) return null;
  if (!fs.lstatSync(name).isFile()) throw Error(`Expected a regular policy/config file: ${name}`);
  return { bytes: fs.readFileSync(name), mode: fs.statSync(name).mode & 0o777 };
}
function restore(name, original) {
  if (original) atomicWrite(name, original.bytes, original.mode);
  else if (exists(name)) fs.unlinkSync(name);
}
function nginxReload() {
  // 沿用服务器现有命令；校验通过才 reload，不 restart 或操作其他服务。
  execFileSync('nginx', ['-t'], { stdio: 'pipe' });
  execFileSync('systemctl', ['reload', 'nginx'], { stdio: 'pipe' });
}
function prepareFilingPolicy(incoming, source) {
  if (filingMode !== '1') {
    if (exists(filingPolicy)) throw Error('Filing policy is active; refusing a non-filing release');
    return null;
  }
  if (!/^\/[A-Za-z0-9_/-]+$/.test(root)) throw Error('Filing mode needs a safe nginx site-root path');
  if (!path.isAbsolute(nginxConfig) || path.resolve(nginxConfig) !== nginxConfig) throw Error('Unsafe nginx config path');
  const buildMarker = path.join(source, 'filing-build.json');
  if (!incoming.includes(buildMarker)) throw Error('Filing release needs filing-build.json');
  const build = JSON.parse(fs.readFileSync(buildMarker, 'utf8'));
  if (build.mode !== 'filing' || JSON.stringify(build.publicSections) !== JSON.stringify(['archive', 'cp', 'about']) ||
      build.communityEnabled !== false || build.radioEnabled !== false) throw Error('Invalid filing build marker');
  // 拒绝错误构建，不能仅靠服务器隐藏把完整版重新传到备案 release。
  const hidden = incoming.filter(file => filingRules.slice(1).some(rule => new RegExp(rule, 'i').test('/' + path.relative(source, file).split(path.sep).join('/'))));
  if (hidden.length) throw Error(`Filing release contains hidden files: ${hidden.slice(0, 5).map(file => path.relative(source, file)).join(', ')}`);
  const configBefore = snapshot(nginxConfig);
  if (!configBefore) throw Error('Missing glfans nginx config');
  const policyBefore = snapshot(filingPolicy);
  const original = configBefore.bytes.toString('utf8');
  const rootLine = `    root ${root}/current;`;
  const includeLine = `    include ${filingPolicy};`;
  if (original.split(rootLine).length !== 2 || !original.includes('    server_name glfans.com;')) throw Error('Nginx config does not match the isolated glfans site');
  if (/include [^;]*filing-policy\.conf;/.test(original) && !original.includes(includeLine)) throw Error('Unexpected existing filing policy include');
  const updated = original.includes(includeLine) ? original : original.replace(rootLine, `${includeLine}\n${rootLine}`);
  return { configBefore, policyBefore, updated };
}
function activateFilingPolicy(prepared) {
  if (!prepared) return;
  const backups = path.join(root, 'shared/filing-backups', id);
  directory(backups);
  fs.writeFileSync(path.join(backups, 'nginx-before.conf'), prepared.configBefore.bytes, { flag: 'wx', mode: 0o600 });
  if (prepared.policyBefore) fs.writeFileSync(path.join(backups, 'policy-before.conf'), prepared.policyBefore.bytes, { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(path.join(release, '.glfans-filing-policy.conf'), filingContents, { flag: 'wx', mode: 0o644 });
  try {
    atomicWrite(filingPolicy, filingContents);
    atomicWrite(nginxConfig, prepared.updated, prepared.configBefore.mode);
    nginxReload();
  } catch (error) {
    restore(nginxConfig, prepared.configBefore);
    restore(filingPolicy, prepared.policyBefore);
    try { nginxReload(); }
    catch (rollbackError) { throw new AggregateError([error, rollbackError], 'Filing policy activation and nginx rollback failed; static current is unchanged'); }
    throw new Error('Filing policy activation failed; previous nginx policy restored and static current unchanged', { cause: error });
  }
}

directory(root);
directory(releases);
directory(path.join(root, 'shared'));
directory(shared);
directory(blobs);
const lock = path.join(root, '.static-deploy-lock');
// 并发发布或维护直接失败，不自动清除可能仍在使用的锁。
fs.mkdirSync(lock, { mode: 0o700 });
let linked = 0;
const verified = new Set();
function blobFor(file) {
  const bytes = fs.readFileSync(file);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const blob = path.join(blobs, hash);
  if (!verified.has(hash)) {
    if (exists(blob)) {
      if (!fs.lstatSync(blob).isFile() || !fs.readFileSync(blob).equals(bytes)) throw Error(`Invalid content blob: ${hash}`);
    } else {
      const temp = path.join(blobs, `.glfans-asset-${randomUUID()}`);
      try {
        fs.writeFileSync(temp, bytes, { flag: 'wx', mode: 0o644 });
        fs.renameSync(temp, blob);
      } finally { if (exists(temp)) fs.unlinkSync(temp); }
    }
    verified.add(hash);
  }
  return blob;
}
function linkFile(blob, target) {
  directory(path.dirname(target));
  if (exists(target)) {
    const old = fs.lstatSync(target);
    if (!old.isFile()) throw Error(`Not a regular target file: ${target}`);
    const content = fs.statSync(blob);
    if (old.ino === content.ino && old.dev === content.dev) return;
  }
  const temp = path.join(path.dirname(target), `.glfans-asset-${randomUUID()}`);
  try {
    fs.linkSync(blob, temp);
    fs.renameSync(temp, target);
    linked++;
  } finally { if (exists(temp)) fs.unlinkSync(temp); }
}
function mergeAssets(dir, missingOnly = false) {
  if (!exists(dir)) return;
  for (const file of files(dir)) {
    const target = path.join(shared, path.relative(dir, file));
    if (!missingOnly || !exists(target)) linkFile(blobFor(file), target);
  }
}

try {
  const previous = activeRelease();
  if (maintenance) {
    // 先完整校验，再逐文件原子替换；路径、字节和 current 均不变。
    const all = [...files(releases), ...files(shared)];
    for (const file of all) linkFile(blobFor(file), file);
    console.log(`Deduplicated ${all.length} files; replaced ${linked} links; current unchanged.`);
  } else {
    if (exists(release)) throw Error(`Release already exists: ${release}`);
    const source = path.resolve(input);
    const incoming = files(source);
    if (!incoming.includes(path.join(source, 'index.html')) || !fs.statSync(path.join(source, 'assets')).isDirectory()) throw Error('Release needs index.html and assets');
    const filing = prepareFilingPolicy(incoming, source);
    files(shared);
    directory(release);
    for (const file of incoming) linkFile(blobFor(file), path.join(release, path.relative(source, file)));
    if (!exists(marker)) {
      // 兼容旧安装，只做一次历史补齐。此后发布不再重扫全部历史版本。
      for (const entry of fs.readdirSync(releases)) {
        if (entry !== id) mergeAssets(path.join(releases, entry, 'assets'), true);
      }
      if (previous) mergeAssets(path.join(previous, 'assets'));
    }
    mergeAssets(path.join(release, 'assets'));
    // 先关旧接口和隐藏资源，再切换前端。若静态切换失败，限制继续生效，避免意外重新开放。
    activateFilingPolicy(filing);
    const next = path.join(root, `.current-${randomUUID()}`);
    try {
      fs.symlinkSync(release, next);
      fs.renameSync(next, current);
    } finally { if (exists(next)) fs.unlinkSync(next); }
    fs.writeFileSync(marker, '1\n', { mode: 0o644 });
    console.log(`Activated glfans release: ${release}`);
    console.log(`Content store: ${blobs}; ${linked} links updated. Old releases/assets retained.`);
    if (filing) console.log(`Filing policy active: ${filingPolicy}; hidden routes/assets and community API return 404.`);
  }
} finally {
  fs.rmdirSync(lock);
}
NODE
