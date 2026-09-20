import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("production metadata and documentation use glfans.com as the primary origin", () => {
  const html = read("../index.html");
  const readme = read("../README.md");
  const issueTemplate = read("../.github/ISSUE_TEMPLATE/rights-feedback.yml");

  assert.match(html, /<link rel="canonical" href="https:\/\/glfans\.com\/"/);
  assert.match(html, /<meta property="og:url" content="https:\/\/glfans\.com\/"/);
  assert.match(readme, /主站：glfans\.com/);
  assert.doesNotMatch(readme, /fanmihua\.github\.io\/glfans/);
  assert.match(issueTemplate, /https:\/\/glfans\.com\/#\/\.\.\./);
});

test("production boot recovers stale lazy chunks without leaving a blank page", () => {
  const main = read("../src/main.jsx");
  const boundary = read("../src/AppRecoveryBoundary.jsx");

  assert.match(main, /installChunkRecovery\(\)/);
  assert.match(main, /<AppRecoveryBoundary>/);
  assert.match(main, /applicationRoot\.render\(<PageLoader/);
  assert.match(main, /glfans bootstrap failed/);
  assert.match(main, /<AppRecoveryScreen/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /重新加载/);
});

test("filing notice is shared by page footers and standalone special routes", () => {
  const filing = read("../src/FilingNotice.jsx");
  const rights = read("../src/RightsNotice.jsx");
  const app = read("../src/App.jsx");
  const home = read("../src/HomePage.jsx");
  const mobileStyles = read("../src/mobile-section-nav.css");

  assert.match(filing, /京ICP备2025151071号-4/);
  assert.match(filing, /https:\/\/beian\.miit\.gov\.cn\//);
  assert.match(rights, /<FilingNotice \/>/);
  assert.match(app, /rootRoute !== "home"/);
  assert.match(home, /HomeRightsNotice className="home-rights-cover"/);
  assert.match(mobileStyles, /site-rights-notice:not\(\.about-mobile-rights\)/);
});

test("VPS defaults to the domain root and Pages opts into its fallback subpath", () => {
  const vite = read("../vite.config.mjs");
  const workflow = read("../.github/workflows/deploy-pages.yml");

  assert.match(vite, /normalizeBasePath\(process\.env\.VITE_BASE_PATH\)/);
  assert.doesNotMatch(vite, /GITHUB_ACTIONS/);
  assert.match(workflow, /VITE_BASE_PATH: \/glfans\//);
  assert.match(workflow, /on:\s+workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s+push:/m);
});

test("Nginx template isolates static, API and certificate concerns", () => {
  const nginx = read("../ops/nginx/glfans.conf.example");

  assert.match(nginx, /root \/var\/www\/glfans\/current;/);
  assert.match(nginx, /return 301 https:\/\/glfans\.com\$request_uri;/);
  assert.match(nginx, /location \^~ \/api\/ \{[\s\S]*proxy_pass http:\/\/127\.0\.0\.1:3100;/);
  assert.match(nginx, /^limit_req_zone \$binary_remote_addr zone=glfans_api_req:10m rate=10r\/s;$/m);
  assert.match(nginx, /^limit_conn_zone \$binary_remote_addr zone=glfans_api_conn:10m;$/m);
  assert.match(nginx, /location \^~ \/api\/ \{[\s\S]*limit_req zone=glfans_api_req burst=30 nodelay;/);
  assert.match(nginx, /location \^~ \/api\/ \{[\s\S]*limit_conn glfans_api_conn 20;/);
  assert.match(nginx, /location \^~ \/api\/ \{[\s\S]*limit_req_status 429;[\s\S]*limit_conn_status 429;/);
  assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html;/);
  assert.match(nginx, /model\/gltf-binary glb/);
  assert.match(nginx, /application\/wasm wasm/);
  assert.match(nginx, /root \/var\/www\/letsencrypt-glfans;/);
  assert.match(nginx, /ssl_certificate \/etc\/letsencrypt-glfans\/live\/glfans\.com\/fullchain\.pem;/);
  assert.match(nginx, /ssl_certificate_key \/etc\/letsencrypt-glfans\/live\/glfans\.com\/privkey\.pem;/);
  assert.doesNotMatch(nginx, /\/etc\/letsencrypt\//);
});

test("retired WeChat diagnostics redirect to the public site", () => {
  assert.equal(existsSync(new URL("../public/wechat-share-check.html", import.meta.url)), false);
  const nginx = read("../ops/nginx/glfans.conf.example");
  assert.match(nginx, /location = \/wechat-share-check\.html \{\s*return 301 https:\/\/glfans\.com\//);
});

test("static releases retain old hashed assets without shipping macOS metadata", () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "glfans-static-release-"));
  const sourceDir = path.join(fixtureRoot, "source");
  const sourceAssets = path.join(sourceDir, "assets");
  const siteRoot = path.join(fixtureRoot, "site");
  const deployScript = fileURLToPath(new URL("../scripts/deploy-static-vps.sh", import.meta.url));
  const deploy = (releaseId) => execFileSync("bash", [deployScript, sourceDir], {
    env: {
      ...process.env,
      GLFANS_SITE_ROOT: siteRoot,
      GLFANS_RELEASE_ID: releaseId,
    },
    encoding: "utf8",
  });
  const metadataNames = (directory) => {
    const matches = [];
    const visit = (current) => {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        if (entry.name === ".DS_Store" || entry.name.startsWith("._")) matches.push(entry.name);
        if (entry.isDirectory()) visit(path.join(current, entry.name));
      }
    };
    visit(directory);
    return matches;
  };

  try {
    mkdirSync(path.join(sourceAssets, "nested"), { recursive: true });
    writeFileSync(path.join(sourceDir, "index.html"), '<script src="/assets/old-hash.js"></script>');
    writeFileSync(path.join(sourceAssets, "old-hash.js"), "old chunk");
    writeFileSync(path.join(sourceAssets, "stable.css"), "first stable value");
    writeFileSync(path.join(sourceAssets, "._old-hash.js"), "AppleDouble");
    writeFileSync(path.join(sourceAssets, "nested", ".DS_Store"), "Finder metadata");
    deploy("release-one");

    rmSync(path.join(sourceAssets, "old-hash.js"));
    writeFileSync(path.join(sourceDir, "index.html"), '<script src="/assets/new-hash.js"></script>');
    writeFileSync(path.join(sourceAssets, "new-hash.js"), "new chunk");
    writeFileSync(path.join(sourceAssets, "stable.css"), "second stable value");
    writeFileSync(path.join(sourceAssets, "._new-hash.js"), "AppleDouble");
    deploy("release-two");

    const sharedAssets = path.join(siteRoot, "shared", "assets");
    assert.equal(readFileSync(path.join(sharedAssets, "old-hash.js"), "utf8"), "old chunk");
    assert.equal(readFileSync(path.join(sharedAssets, "new-hash.js"), "utf8"), "new chunk");
    assert.equal(readFileSync(path.join(sharedAssets, "stable.css"), "utf8"), "second stable value");
    assert.deepEqual(metadataNames(sharedAssets), []);
    assert.deepEqual(metadataNames(path.join(siteRoot, "releases", "release-one")), []);
    assert.deepEqual(metadataNames(path.join(siteRoot, "releases", "release-two")), []);
    assert.equal(readlinkSync(path.join(siteRoot, "current")), path.join(siteRoot, "releases", "release-two"));
    assert.equal(existsSync(path.join(siteRoot, "releases", "release-one", "assets", "old-hash.js")), true);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("Nginx serves persistent assets, does not store HTML, and logs static failures", () => {
  const nginx = read("../ops/nginx/glfans.conf.example");

  assert.match(nginx, /map \$status \$glfans_static_error \{[\s\S]*~\^\[45\] 1;/);
  assert.match(nginx, /map \$sent_http_content_type \$glfans_html_cache_control \{[\s\S]*no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(nginx, /add_header Cache-Control \$glfans_html_cache_control always;/);
  assert.match(nginx, /location \^~ \/assets\/ \{[\s\S]*root \/var\/www\/glfans\/shared;[\s\S]*expires 1y;/);
  assert.match(nginx, /location \^~ \/assets\/ \{[\s\S]*access_log \/var\/log\/nginx\/glfans\.access\.log combined if=\$glfans_static_error;/);
  assert.doesNotMatch(nginx, /access_log off;/);
  assert.doesNotMatch(nginx, /location = \/index\.html \{\s*expires -1;/);
});

test("Certbot renewal is isolated from the server's legacy configuration", () => {
  const bootstrap = read("../ops/nginx/glfans-bootstrap.conf.example");
  const service = read("../ops/systemd/certbot-glfans.service");
  const timer = read("../ops/systemd/certbot-glfans.timer");
  const hook = read("../ops/certbot/reload-nginx.sh");
  const guide = read("../docs/VPS_DEPLOYMENT.md");

  assert.match(bootstrap, /root \/var\/www\/letsencrypt-glfans;/);
  assert.doesNotMatch(bootstrap, /root \/var\/www\/letsencrypt;/);

  assert.match(service, /ExecStart=\/snap\/bin\/certbot renew/);
  for (const option of [
    "--config-dir /etc/letsencrypt-glfans",
    "--work-dir /var/lib/letsencrypt-glfans",
    "--logs-dir /var/log/letsencrypt-glfans",
    "--deploy-hook /usr/local/libexec/certbot-glfans/reload-nginx.sh",
  ]) assert.ok(service.includes(option), `missing isolated Certbot option: ${option}`);
  assert.doesNotMatch(service, /\/etc\/letsencrypt(?:\s|\/)/);

  assert.match(timer, /Unit=certbot-glfans\.service/);
  assert.equal(timer.match(/^OnCalendar=/gm)?.length, 2);
  assert.match(hook, /expected_lineage="\/etc\/letsencrypt-glfans\/live\/glfans\.com"/);
  assert.match(hook, /\/usr\/sbin\/nginx -t/);
  assert.match(hook, /\/usr\/bin\/systemctl reload nginx\.service/);

  assert.match(guide, /Certbot 5\.8/);
  assert.match(guide, /\/snap\/bin\/certbot certonly/);
  assert.match(guide, /\/snap\/bin\/certbot renew/);
  assert.doesNotMatch(guide, /sudo certbot /);
  for (const path of [
    "/var/www/letsencrypt-glfans",
    "/etc/letsencrypt-glfans",
    "/var/lib/letsencrypt-glfans",
    "/var/log/letsencrypt-glfans",
  ]) assert.ok(guide.includes(path), `deployment guide is missing ${path}`);
});

test("API systemd unit and atomic deploy stay inside the glfans boundary", () => {
  const service = read("../ops/systemd/glfans-api.service.example");
  const deploy = read("../scripts/deploy-api-vps.sh");
  const config = read("../server/config.js");

  assert.match(service, /^User=glfans$/m);
  assert.match(service, /^Group=glfans$/m);
  assert.match(service, /^WorkingDirectory=\/opt\/glfans-api\/current$/m);
  assert.match(service, /^EnvironmentFile=\/etc\/glfans\/glfans-api\.env$/m);
  assert.match(service, /^ExecStart=\/usr\/bin\/node server\/index\.js$/m);
  assert.match(service, /^ProtectSystem=strict$/m);
  assert.match(service, /^NoNewPrivileges=true$/m);
  assert.match(service, /^MemoryHigh=192M$/m);
  assert.match(service, /^MemoryMax=256M$/m);
  assert.match(service, /^TasksMax=64$/m);
  assert.doesNotMatch(service, /PM2|fanstudio|uxquiz/i);

  assert.match(config, /host: "127\.0\.0\.1"/);
  assert.match(config, /positiveInteger\(env\.GLFANS_PORT, 3100/);
  assert.match(deploy, /^app_root="\/opt\/glfans-api"$/m);
  assert.match(deploy, /^service_name="glfans-api\.service"$/m);
  assert.match(deploy, /\/usr\/bin\/npm ci --omit=dev --ignore-scripts/);
  assert.match(deploy, /\/usr\/bin\/node --test server\/tests\/\*\.test\.mjs/);
  assert.match(deploy, /production_files=\(/);
  assert.match(deploy, /copy_pattern_files server\/tests '\*\.test\.mjs' '\^\[A-Za-z0-9\]/);
  assert.match(deploy, /copy_pattern_files db\/migrations '\*\.sql' '\^\[0-9\]\[A-Za-z0-9\._-\]\*\\\.sql\$'/);
  assert.match(deploy, /copy_pattern_files db\/seeds '\*\.sql' '\^\[0-9\]\[A-Za-z0-9\._-\]\*\\\.sql\$'/);
  assert.match(deploy, /if \[\[ "\$filename" == \._\* \]\]; then\s+continue/);
  assert.doesNotMatch(deploy, /cp -a .*server.*scripts.*db/);
  assert.match(deploy, /\.env\|\.env\.\*\|\*\.env\|\*\.env\.\*/);
  assert.match(deploy, /\*export\*\.json\|\*snapshot\*\.json/);
  assert.match(deploy, /community-import\.example\.json\)/);
  assert.match(deploy, /chown -R "root:\$service_group" "\$release_dir"/);
  assert.match(deploy, /-type d -exec \/usr\/bin\/chmod 0750/);
  assert.match(deploy, /-type f -exec \/usr\/bin\/chmod 0640/);
  assert.match(deploy, /renameSync\(process\.argv\[1\], process\.argv\[2\]\)/);
  assert.match(deploy, /systemctl restart "\$service_name"/);
  assert.match(deploy, /http:\/\/127\.0\.0\.1:3100\/api\/health/);
  assert.match(deploy, /rolling back glfans API/i);
  const rollbackStart = deploy.indexOf("rollback() {");
  const rollbackEnd = deploy.indexOf("\n}\n\nif ! /usr/bin/systemctl restart", rollbackStart);
  const rollbackBody = deploy.slice(rollbackStart, rollbackEnd);
  assert.match(rollbackBody, /systemctl restart "\$service_name"[\s\S]*if ! wait_for_health/);
  assert.match(rollbackBody, /Rollback failed: the previous API release is selected but did not pass its health check/);
  assert.ok(
    rollbackBody.indexOf("if ! wait_for_health") < rollbackBody.indexOf("Restored healthy previous API release"),
    "rollback must verify the previous release before reporting success",
  );
  assert.doesNotMatch(deploy, /pm2|systemctl restart (?:nginx|mysql|fanstudio|uxquiz)/i);
});

test("database backup is glfans-only and keeps credentials off command arguments", () => {
  const backup = read("../scripts/backup-glfans-mysql.sh");
  const clientConfig = read("../ops/mysql/glfans-backup.cnf.example");
  const backupEnv = read("../ops/backup/glfans-backup.env.example");
  const service = read("../ops/systemd/glfans-mysql-backup.service");
  const timer = read("../ops/systemd/glfans-mysql-backup.timer");

  assert.match(backup, /^database="glfans"$/m);
  assert.match(backup, /^defaults_file="\/etc\/glfans\/mysql-backup\.cnf"$/m);
  assert.match(backup, /^backup_dir="\/var\/backups\/glfans-mysql"$/m);
  assert.match(backup, /\/usr\/bin\/mysqldump \\\n+\s+"--defaults-extra-file=\$defaults_file"/);
  assert.doesNotMatch(backup, /--all-databases|--password|MYSQL_PWD/);
  assert.match(backup, /\/usr\/bin\/mktemp "\$backup_dir\/\.glfans-/);
  assert.match(backup, /\/usr\/bin\/gzip -t "\$temporary_file"/);
  assert.match(backup, /\/usr\/bin\/sha256sum/);
  assert.match(backup, /-mtime "\+\$retention_days" -delete/);

  assert.match(clientConfig, /^user=glfans_backup$/m);
  assert.match(clientConfig, /^host=127\.0\.0\.1$/m);
  assert.doesNotMatch(backupEnv, /DB_PASSWORD|password=/i);
  assert.doesNotMatch(backupEnv, /BACKUP_DIR|DEFAULTS_FILE/);
  assert.match(service, /^ConditionPathExists=\/etc\/glfans\/mysql-backup\.cnf$/m);
  assert.match(service, /^EnvironmentFile=-\/etc\/glfans\/glfans-backup\.env$/m);
  assert.match(service, /^ExecStart=\/usr\/local\/sbin\/backup-glfans-mysql$/m);
  assert.match(service, /^User=root$/m);
  assert.match(service, /^ReadWritePaths=\/var\/backups\/glfans-mysql \/run\/lock$/m);
  assert.match(timer, /^OnCalendar=/m);
  assert.match(timer, /^Persistent=true$/m);
  assert.match(timer, /^Unit=glfans-mysql-backup\.service$/m);
});

test("deployment guide separates local Node 22 builds from the verified Node 20 API runtime", () => {
  const guide = read("../docs/VPS_DEPLOYMENT.md");
  const apiEnv = read("../ops/env/glfans-api.env.example");
  const migrationEnv = read("../ops/env/glfans-migration.env.example");

  assert.match(guide, /本地按仓库要求使用 Node\.js 22 构建/);
  assert.match(guide, /Node\.js v20\.20\.2 \/ npm 10\.8\.2/);
  assert.match(guide, /不应为了 glfans 全局升级 Node/);
  assert.match(guide, /root:glfans 640/);
  assert.match(guide, /root:root 600/);
  assert.match(guide, /异地加密副本仍是独立待办/);
  assert.match(guide, /MemoryHigh=192M/);
  assert.match(guide, /MemoryMax=256M/);
  assert.match(guide, /TasksMax=64/);
  assert.match(guide, /平均 10 请求\/秒、允许 30 请求突发，最多 20 个并发连接/);
  assert.match(apiEnv, /^GLFANS_PORT=3100$/m);
  assert.doesNotMatch(apiEnv, /MIGRATION_DB/);
  assert.match(migrationEnv, /^GLFANS_MIGRATION_DB_USER=glfans_migrator$/m);
});

test("database setup ignores macOS AppleDouble SQL metadata sidecars", () => {
  const migrationScript = read("../scripts/migrate-glfans-db.mjs");
  const seedScript = read("../scripts/seed-glfans-db.mjs");

  for (const script of [migrationScript, seedScript]) {
    assert.match(script, /\^\[0-9\]\[A-Za-z0-9\._-\]\*\\\.sql\$/);
    assert.doesNotMatch(script, /name\.endsWith\("\\\.sql"\)/);
  }
});

test("API release staging ignores AppleDouble files and keeps only numbered SQL", () => {
  const deploy = read("../scripts/deploy-api-vps.sh");
  const stagedSqlFiles = [
    "001_community.sql",
    "002-next.sql",
    "._001_community.sql",
    "README.sql",
    ".hidden.sql",
  ];
  const numberedSql = /^[0-9][A-Za-z0-9._-]*\.sql$/;

  assert.deepEqual(stagedSqlFiles.filter((name) => name !== "._001_community.sql" && numberedSql.test(name)), [
    "001_community.sql",
    "002-next.sql",
  ]);
  assert.match(deploy, /filename_regex="\$3"/);
  assert.match(deploy, /"\$filename" =~ \$filename_regex/);
  assert.match(deploy, /'\^\[0-9\]\[A-Za-z0-9\._-\]\*\\\.sql\$'/);
});
