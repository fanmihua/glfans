import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/deploy-static-vps.sh', import.meta.url));
function fixture(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'glfans-storage-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'site');
  const source = path.join(base, 'source');
  const put = (name, content) => { mkdirSync(path.dirname(name), { recursive: true }); writeFileSync(name, content); };
  put(path.join(source, 'index.html'), '<html>one</html>');
  put(path.join(source, 'assets/photo.webp'), 'same image');
  const run = (input = source, id = 'one') => execFileSync('bash', [script, input], {
    env: { ...process.env, GLFANS_SITE_ROOT: root, GLFANS_RELEASE_ID: id }, encoding: 'utf8', stdio: 'pipe',
  });
  return { base, root, source, put, run };
}
const inode = file => `${statSync(file).dev}:${statSync(file).ino}`;
function manifest(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = path.join(dir, entry.name);
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) return manifest(name, relative);
    if (entry.isSymbolicLink()) return [[relative, readlinkSync(name)]];
    return [[relative, createHash('sha256').update(readFileSync(name)).digest('hex')]];
  });
}

test('identical files share storage; updates never alter old releases or upload source', t => {
  const { root, source, put, run } = fixture(t);
  run();
  put(path.join(source, 'index.html'), '<html>two</html>');
  run(source, 'two');
  const first = path.join(root, 'releases/one/assets/photo.webp');
  const second = path.join(root, 'releases/two/assets/photo.webp');
  const shared = path.join(root, 'shared/assets/photo.webp');
  assert.equal(inode(first), inode(second));
  assert.equal(inode(first), inode(shared));
  assert.notEqual(inode(first), inode(path.join(source, 'assets/photo.webp')));
  put(path.join(source, 'assets/photo.webp'), 'new image');
  run(source, 'three');
  assert.equal(readFileSync(first, 'utf8'), 'same image');
  assert.equal(readFileSync(second, 'utf8'), 'same image');
  assert.equal(readFileSync(shared, 'utf8'), 'new image');
  assert.notEqual(inode(first), inode(shared));
  assert.equal(inode(shared), inode(path.join(root, 'releases/three/assets/photo.webp')));
  assert.equal(readFileSync(path.join(root, 'releases/one/index.html'), 'utf8'), '<html>one</html>');
});

test('legacy maintenance preserves every path, byte and active release; repeated maintenance is safe', t => {
  const { root, put, run } = fixture(t);
  for (const release of ['old', 'active']) {
    put(path.join(root, 'releases', release, 'assets/photo.webp'), 'shared photo');
    put(path.join(root, 'releases', release, 'index.html'), release);
  }
  put(path.join(root, 'shared/assets/photo.webp'), 'shared photo');
  put(path.join(root, 'shared/assets/older-hash.js'), 'still used by an old tab');
  symlinkSync(path.join(root, 'releases/active'), path.join(root, 'current'));
  const before = [manifest(path.join(root, 'releases')), manifest(path.join(root, 'shared/assets'))];
  run('--deduplicate');
  assert.deepEqual([manifest(path.join(root, 'releases')), manifest(path.join(root, 'shared/assets'))], before);
  assert.equal(readlinkSync(path.join(root, 'current')), path.join(root, 'releases/active'));
  assert.equal(inode(path.join(root, 'releases/old/assets/photo.webp')), inode(path.join(root, 'shared/assets/photo.webp')));
  assert.match(run('--deduplicate'), /replaced 0 links/);
});

test('first upgraded deployment bootstraps historical hashes only once', t => {
  const { root, source, put, run } = fixture(t);
  put(path.join(root, 'releases/legacy/assets/old-hash.js'), 'old chunk');
  put(path.join(root, 'releases/legacy/index.html'), 'old html');
  symlinkSync(path.join(root, 'releases/legacy'), path.join(root, 'current'));
  run();
  assert.equal(readFileSync(path.join(root, 'shared/assets/old-hash.js'), 'utf8'), 'old chunk');
  // 标记建立后不再读历史树，也不重新覆盖当前同名资源。
  symlinkSync(source, path.join(root, 'releases/legacy/assets/not-followed'));
  run(source, 'two');
  assert.equal(readFileSync(path.join(root, 'shared/assets/old-hash.js'), 'utf8'), 'old chunk');
});

test('unsafe input, duplicate ID, corrupt blob and held lock cannot activate a release', t => {
  const { base, root, source, put, run } = fixture(t);
  run();
  const active = readlinkSync(path.join(root, 'current'));
  assert.throws(() => run(), /Release already exists/);
  assert.throws(() => run(source, '..'), /Unsafe release ID/);
  symlinkSync(path.join(base, 'outside'), path.join(source, 'assets/escape'));
  assert.throws(() => run(source, 'escape'), /symbolic link/);
  rmSync(path.join(source, 'assets/escape'));
  assert.equal(existsSync(path.join(root, 'releases/escape')), false);
  mkdirSync(path.join(root, '.static-deploy-lock'));
  assert.throws(() => run(source, 'locked'), /EEXIST/);
  rmSync(path.join(root, '.static-deploy-lock'), { recursive: true });
  const bytes = 'new unique content';
  put(path.join(source, 'assets/new.webp'), bytes);
  const hash = createHash('sha256').update(bytes).digest('hex');
  put(path.join(root, 'shared/blobs', hash), 'bad blob');
  assert.throws(() => run(source, 'corrupt'), /Invalid content blob/);
  assert.equal(readlinkSync(path.join(root, 'current')), active);
  assert.equal(readFileSync(path.join(root, 'shared/assets/photo.webp'), 'utf8'), 'same image');
  assert.equal(existsSync(path.join(root, '.static-deploy-lock')), false);
});

test('deployment refuses redirected shared directories', t => {
  const { base, root, run } = fixture(t);
  mkdirSync(path.join(root, 'shared'), { recursive: true });
  const outside = path.join(base, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, path.join(root, 'shared/assets'));
  assert.throws(() => run(), /Not a real directory/);
  assert.deepEqual(readdirSync(outside), []);
  assert.equal(existsSync(path.join(root, 'current')), false);
});
