import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/deploy-static-vps.sh', import.meta.url));
const publicSections = ['archive', 'cp', 'column', 'memes', 'about'];

function fixture(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'glfans-filing-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'site');
  const source = path.join(base, 'source');
  const config = path.join(base, 'glfans.conf');
  const log = path.join(base, 'commands.log');
  const policy = path.join(root, 'shared/filing-policy.conf');
  const bin = path.join(base, 'bin');
  const put = (name, value, mode = 0o644) => {
    mkdirSync(path.dirname(name), { recursive: true });
    writeFileSync(name, value, { mode });
  };
  const original = `server {\n    server_name glfans.com;\n    root ${root}/current;\n    location ^~ /api/ { proxy_pass http://127.0.0.1:3100; }\n}\n`;
  put(config, original);
  put(path.join(source, 'index.html'), 'archive and cp');
  put(path.join(source, 'filing-build.json'), JSON.stringify({ mode: 'filing', publicSections, communityEnabled: false, radioEnabled: false }));
  const makeFeed = (sections = publicSections) => {
    const files = {};
    for (const name of ['catalog', 'cpCatalog', 'schedule', 'en', 'th', 'calendarZh', 'calendarEn', 'calendarTh', 'sourceContent']) {
      const bytes = JSON.stringify(name === 'catalog' ? { homeLinks: sections.map(id => ({ id })), quotes: [], radio: { tracks: [] }, homeCards: [] } : {}) + '\n';
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      files[name] = { url: `https://glfans.com/assets/app-content/${sha256}.json`, sha256, bytes: Buffer.byteLength(bytes) };
      put(path.join(source, `assets/app-content/${sha256}.json`), bytes);
    }
    const manifest = { schemaVersion: 1, files, assets: {} };
    manifest.version = createHash('sha256').update(JSON.stringify(manifest) + '\n').digest('hex');
    put(path.join(source, 'app-content/v1/manifest.json'), JSON.stringify(manifest));
    return manifest;
  };
  makeFeed();
  put(path.join(source, 'assets/ArchivePage-old.js'), 'old archive');
  put(path.join(bin, 'nginx'), `#!/bin/sh\nprintf 'nginx %s\\n' "$*" >> "$MOCK_LOG"\nif [ "$MOCK_FAIL_TEST" = 1 ] && [ -f "$GLFANS_SITE_ROOT/shared/filing-policy.conf" ]; then exit 1; fi\n`, 0o755);
  put(path.join(bin, 'systemctl'), `#!/bin/sh\nprintf 'systemctl %s\\n' "$*" >> "$MOCK_LOG"\nif [ "$MOCK_FAIL_RELOAD" = 1 ] && [ -f "$GLFANS_SITE_ROOT/shared/filing-policy.conf" ]; then exit 1; fi\n`, 0o755);
  const run = (id, filing = true, extra = {}) => execFileSync('bash', [script, source], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GLFANS_SITE_ROOT: root, GLFANS_RELEASE_ID: id,
      GLFANS_FILING_MODE: filing ? '1' : '0', GLFANS_NGINX_CONFIG: config, MOCK_LOG: log, ...extra },
    encoding: 'utf8', stdio: 'pipe',
  });
  return { root, source, config, log, policy, original, put, run, makeFeed };
}

test('filing release enables isolated nginx restrictions and retains previous assets', t => {
  const { root, source, config, log, policy, original, put, run } = fixture(t);
  run('full', false);
  put(path.join(source, 'assets/ArchivePage-new.js'), 'new archive');
  put(path.join(source, 'column/us/index.html'), 'public REPO');
  put(path.join(source, 'assets/column/us/1.webp'), 'article photo');
  put(path.join(source, 'assets/fan-memes/a.jpg'), 'public meme');
  put(path.join(source, 'assets/meme-game/a.glb'), 'meme camera');
  put(path.join(source, 'assets/ArticlePage-new.js'), 'article page');
  put(path.join(source, 'assets/MemesPage-new.js'), 'meme page');
  run('filing');
  const deployed = readFileSync(policy, 'utf8');
  assert.equal(readlinkSync(path.join(root, 'current')), path.join(root, 'releases/filing'));
  assert.equal(readFileSync(path.join(root, 'shared/assets/ArchivePage-old.js'), 'utf8'), 'old archive');
  assert.equal(readFileSync(path.join(root, 'releases/filing/column/us/index.html'), 'utf8'), 'public REPO');
  assert.equal(readFileSync(path.join(root, 'shared/assets/fan-memes/a.jpg'), 'utf8'), 'public meme');
  assert.equal(readFileSync(path.join(root, 'releases/filing/.glfans-filing-policy.conf'), 'utf8'), deployed);
  assert.equal(readFileSync(path.join(root, 'shared/filing-backups/filing/nginx-before.conf'), 'utf8'), original);
  assert.equal(statSync(path.join(root, 'shared/filing-backups/filing/nginx-before.conf')).mode & 0o777, 0o600);
  assert.ok(readFileSync(config, 'utf8').includes(`    include ${policy};\n    root ${root}/current;`));
  assert.match(deployed, /location = \/app-content\/v1\/manifest\.json \{\s+default_type application\/json;\s+expires -1;/);
  assert.equal(readFileSync(log, 'utf8'), 'nginx -t\nsystemctl reload nginx\n');
  assert.throws(() => run('accidental-full', false), /Filing policy is active/);
  assert.equal(existsSync(path.join(root, 'releases/accidental-full')), false);
  run('filing-two');
  assert.equal(readFileSync(config, 'utf8').split(`include ${policy};`).length - 1, 1);
  assert.equal(readFileSync(path.join(root, 'shared/filing-backups/filing-two/policy-before.conf'), 'utf8'), deployed);
});

test('filing rules close hidden routes, historical chunks, media and community endpoints', t => {
  const { policy, run } = fixture(t);
  run('filing');
  const expressions = [...readFileSync(policy, 'utf8').matchAll(/if \(\$uri ~\* "(.+)"\)/g)].map(match => new RegExp(match[1], 'i'));
  const blocked = uri => expressions.some(regex => regex.test(uri));
  for (const uri of ['/api', '/api/', '/api/quotes', '/api/comments', '/api/admin/login', '/api/health/',
    '/column/us/unsaid-fragments-ep07/', '/column/us/unsaid-fragments-ep08', '/column/us/unsaid-fragments-ep12/share.json',
    '/api/wechat/jssdk-signature/anything', '/home', '/radio/', '/tide-words', '/admin', '/polaroid-lab',
    '/assets/pit-radio/a.mp3', '/assets/HomePage-old.js', '/assets/AdminPage-old.js', '/assets/community-api-old.js',
    '/assets/PitRadioPage-old.css', '/assets/WordsTideLab-old.css', '/assets/PolaroidLab-old.js']) {
    assert.equal(blocked(uri), true, uri);
  }
  for (const uri of ['/', '/archive', '/archive/2026/', '/archive/calendar/', '/cp/emibonnie/', '/about/',
    '/api/health', '/api/wechat/jssdk-signature', '/assets/ArchivePage-old.js', '/assets/CpPage-old.js',
    '/assets/en-archive-old.js', '/assets/index-old.js', '/assets/home/cp-cutout.webp', '/assets/cp/children/a.webp',
    '/assets/repo-handdrawn-heart-pink.webp', '/assets/repo-handdrawn-underline-pink.webp',
    '/column/us/episode/1', '/memes/', '/assets/column/us/1.webp', '/assets/fan-memes/a.jpg',
    '/assets/meme-game/a.glb', '/assets/Column-old.js', '/assets/ArticlePage-old.js',
    '/assets/MemesPage-old.js', '/assets/RepoFilmStrip-old.js', '/assets/en-article-old.js', '/assets/th-article-old.js']) {
    assert.equal(blocked(uri), false, uri);
  }
});

for (const failure of ['MOCK_FAIL_TEST', 'MOCK_FAIL_RELOAD']) {
  test(`${failure}: policy failure restores previous config and leaves current unchanged`, t => {
    const { root, source, config, policy, original, put, run } = fixture(t);
    run('full', false);
    put(path.join(source, 'index.html'), 'filing update');
    assert.throws(() => run('failed', true, { [failure]: '1' }), /previous nginx policy restored/);
    assert.equal(readFileSync(config, 'utf8'), original);
    assert.equal(existsSync(policy), false);
    assert.equal(readlinkSync(path.join(root, 'current')), path.join(root, 'releases/full'));
    assert.equal(existsSync(path.join(root, '.static-deploy-lock')), false);
  });
}

test('filing mode rejects hidden build artifacts before writing a release or nginx config', t => {
  const { root, source, config, policy, original, put, run } = fixture(t);
  run('full', false);
  put(path.join(source, 'assets/pit-radio/song.mp3'), 'old music');
  assert.throws(() => run('bad-build'), /Filing release contains hidden files/);
  assert.equal(readFileSync(config, 'utf8'), original);
  assert.equal(existsSync(policy), false);
  assert.equal(existsSync(path.join(root, 'releases/bad-build')), false);
  assert.equal(readlinkSync(path.join(root, 'current')), path.join(root, 'releases/full'));
});

test('filing mode refuses a config belonging to another site', t => {
  const { root, config, put, run } = fixture(t);
  put(config, 'server { server_name another.example; root /var/www/another; }');
  assert.throws(() => run('bad-site'), /does not match the isolated glfans site/);
  assert.equal(existsSync(path.join(root, 'current')), false);
});

test('filing mode requires the build marker to declare the restricted sections and disabled features', t => {
  const { root, source, put, run } = fixture(t);
  rmSync(path.join(source, 'filing-build.json'));
  assert.throws(() => run('missing-marker'), /needs filing-build.json/);
  put(path.join(source, 'filing-build.json'), JSON.stringify({ mode: 'filing', publicSections, communityEnabled: true, radioEnabled: false }));
  assert.throws(() => run('bad-marker'), /Invalid filing build marker/);
  assert.equal(existsSync(path.join(root, 'current')), false);
});

test('filing deploy refuses an App manifest whose public sections differ from the website', t => {
  const { root, run, makeFeed } = fixture(t);
  makeFeed(['archive', 'cp', 'tide-words', 'column', 'memes', 'about']);
  assert.throws(() => run('mismatched-app'), /App content visibility differs/);
  assert.equal(existsSync(path.join(root, 'current')), false);
});

test('filing deploy verifies referenced App bytes before enabling a release', t => {
  const { root, source, put, run, makeFeed } = fixture(t);
  const manifest = makeFeed();
  put(path.join(source, new URL(manifest.files.catalog.url).pathname.slice(1)), 'corrupted bytes');
  assert.throws(() => run('corrupt-app'), /App content hash mismatch/);
  assert.equal(existsSync(path.join(root, 'current')), false);
});
