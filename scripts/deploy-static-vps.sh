#!/usr/bin/env bash
set -euo pipefail

# 保持单文件入口，服务器只需现有 Node，不依赖 checkout/node_modules。
node --input-type=module - "${1:-dist/client}" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

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
    const next = path.join(root, `.current-${randomUUID()}`);
    try {
      fs.symlinkSync(release, next);
      fs.renameSync(next, current);
    } finally { if (exists(next)) fs.unlinkSync(next); }
    fs.writeFileSync(marker, '1\n', { mode: 0o644 });
    console.log(`Activated glfans release: ${release}`);
    console.log(`Content store: ${blobs}; ${linked} links updated. Old releases/assets retained.`);
  }
} finally {
  fs.rmdirSync(lock);
}
NODE
