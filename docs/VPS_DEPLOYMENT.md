# glfans VPS 部署说明

主站固定为 `https://glfans.com/`，静态文件使用 `/var/www/glfans/current`，API 只监听 `127.0.0.1:3100` 并由 Nginx 转发 `/api/`。API、数据库账号、备份、证书和站点配置均使用 glfans 专属名称与目录，不修改 FanStudio 或其他现有服务。

静态站仍在本地按仓库要求使用 Node.js 22 构建。线上只运行社区 API；已针对服务器现有的 **Node.js v20.20.2 / npm 10.8.2** 验收，不要求也不应为了 glfans 全局升级 Node，以免影响服务器上的其他项目。

## 1. 构建根路径版本

在本地使用 Node.js 22：

```bash
npm ci
npm run build
npm run test:sites
node --test tests/*.test.mjs
```

普通构建默认 `base=/`，适用于 VPS。保留的 GitHub Pages workflow 会显式传入 `VITE_BASE_PATH=/glfans/`，不要把 Pages 子路径带进主站构建。

## 2. 建立独立 API 用户与数据库账号

下面的用户、目录和端口只属于 glfans。若 `id glfans` 已存在，应先核对用途，不要重复创建或改动同名用户：

```bash
sudo useradd --system --user-group --home-dir /var/lib/glfans --create-home --shell /usr/sbin/nologin glfans
sudo install -d -o root -g glfans -m 0750 /opt/glfans-api /opt/glfans-api/releases
sudo install -d -o glfans -g glfans -m 0750 /var/cache/glfans-npm
sudo install -d -o root -g glfans -m 0750 /etc/glfans
```

通过本机 `sudo mysql` 交互终端建立独立数据库及三个最小权限账号。三个密码都使用不同的长随机十六进制值；不要把密码放到 shell 命令行、仓库或 Vite 环境变量中：

```sql
CREATE DATABASE glfans CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'glfans_app'@'127.0.0.1' IDENTIFIED BY '替换为应用随机密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON glfans.* TO 'glfans_app'@'127.0.0.1';

CREATE USER 'glfans_migrator'@'127.0.0.1' IDENTIFIED BY '替换为迁移随机密码';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON glfans.* TO 'glfans_migrator'@'127.0.0.1';

CREATE USER 'glfans_backup'@'127.0.0.1' IDENTIFIED BY '替换为备份随机密码';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON glfans.* TO 'glfans_backup'@'127.0.0.1';
```

API 的长期凭据与一次性迁移凭据必须分开。API 文件仅允许 root 与 `glfans` 服务组读取，migration 文件仅允许 root 读取；`glfans-api.service` 只加载第一个文件，绝不能获得 migrator 密码：

```bash
sudo install -o root -g glfans -m 0640 ops/env/glfans-api.env.example /etc/glfans/glfans-api.env
sudo install -o root -g root -m 0600 ops/env/glfans-migration.env.example /etc/glfans/glfans-migration.env
sudoedit /etc/glfans/glfans-api.env
sudoedit /etc/glfans/glfans-migration.env
sudo stat -c '%U:%G %a %n' /etc/glfans/glfans-api.env /etc/glfans/glfans-migration.env
```

输出必须分别是 `root:glfans 640` 与 `root:root 600`。API 环境固定 `GLFANS_DB_HOST=127.0.0.1`、`GLFANS_DB_NAME=glfans`、`GLFANS_DB_USER=glfans_app`、`GLFANS_PORT=3100`；`GLFANS_SECURITY_SECRET` 至少 32 个随机字符，上线后不可随意更换。

## 3. 初始化、迁移并导入数据

在准备发布的服务器暂存 checkout 中安装依赖，然后用 root-only 迁移环境运行两遍初始化；第二遍用于确认 migration 与 seed 可重复执行：

```bash
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
sudo bash -c 'set -a; . /etc/glfans/glfans-migration.env; set +a; cd "$1"; exec /usr/bin/npm run db:init' bash "$PWD"
sudo bash -c 'set -a; . /etc/glfans/glfans-migration.env; set +a; cd "$1"; exec /usr/bin/npm run db:init' bash "$PWD"
```

切换前重新生成的社区快照应以 root-only 文件传到服务器，再由同一迁移账号导入。不要把导出 JSON 放进公开静态目录：

```bash
sudo chmod 0600 /path/to/community-export.json
sudo bash -c 'set -a; . /etc/glfans/glfans-migration.env; set +a; cd "$1"; exec /usr/bin/npm run db:import -- "$2"' bash "$PWD" /path/to/community-export.json
```

管理员密码只放在短生命周期的 `/run` 文件中，创建后立即删除；不能写入 API 的长期 EnvironmentFile。由于该文件由受控 shell 读取，邮箱使用普通 ASCII 邮箱格式，密码使用至少 32 字节的高熵十六进制字符串，不写空格、引号、反引号、`$` 或命令替换字符：

```bash
sudo install -o root -g root -m 0600 /dev/null /run/glfans-admin-once.env
sudoedit /run/glfans-admin-once.env
# 文件只写 GLFANS_ADMIN_EMAIL=... 和 GLFANS_ADMIN_PASSWORD=...
sudo bash -c 'set -a; . /etc/glfans/glfans-migration.env; . /run/glfans-admin-once.env; set +a; cd "$1"; exec /usr/bin/npm run db:admin' bash "$PWD"
sudo unlink /run/glfans-admin-once.env
```

## 4. 安装 API 服务并原子发布

服务以无登录权限的 `glfans` 用户运行，工作目录为 `/opt/glfans-api/current`，日志只进 journald。它使用服务器已有的 `/usr/bin/node` v20.20.2，监听地址由代码固定为 loopback；UFW 不开放 3100：

```bash
sudo install -o root -g root -m 0644 ops/systemd/glfans-api.service.example /etc/systemd/system/glfans-api.service
sudo systemctl daemon-reload
sudo systemctl enable glfans-api.service
sudo bash scripts/deploy-api-vps.sh .
sudo systemctl status glfans-api.service --no-pager
sudo journalctl -u glfans-api.service -n 80 --no-pager
```

`glfans-api.service` 的 cgroup 软内存阈值为 `MemoryHigh=192M`、硬上限为 `MemoryMax=256M`，任务数上限为 `TasksMax=64`；这些限制只作用于 glfans API，避免单个 Node 进程挤占这台 3.6 GiB 共享服务器上的 MySQL、FanStudio 与其他项目。

`deploy-api-vps.sh` 仅按生产白名单复制 API 模块、数据库维护脚本、migration/seed、API 测试与锁文件到 `/opt/glfans-api/releases/<release-id>`；不会整目录打包 checkout。发现真实 `.env`、导出/快照 JSON 或私钥材料时会在复制前直接拒绝发布，合法的 `community-import.example.json` 仅作为格式示例保留。脚本用 glfans 用户执行 `npm ci` 和 API 测试，随后把 release 收紧为 `root:glfans`、目录 `0750`、文件 `0640`，再通过同文件系统 rename 原子切换 `current`。它只重启 `glfans-api.service` 并检查 `127.0.0.1:3100/api/health`；检查失败会切回上一版、重启并再次检查旧版健康状态。只有旧版健康检查通过才报告回滚成功；旧版也不健康时会停止服务并明确要求人工恢复。脚本不删除旧 release，也不触碰其他 PM2/systemd 服务。

迁移要在切换 API 前单独完成；部署脚本故意不持有 migrator 凭据。需要人工回滚时，先核对目标 release，再创建临时软链接并用 Node `renameSync` 替换 `current`，最后只重启 `glfans-api.service`。

## 5. 首次发布静态文件

先把仓库或构建产物放到服务器上的独立暂存目录，再在服务器运行：

```bash
sudo bash scripts/deploy-static-vps.sh dist/client
```

脚本把完整构建复制到 `/var/www/glfans/releases/<release-id>`，并将已有 release、当前 release 和新 release 的 `/assets` 合并到持久目录 `/var/www/glfans/shared/assets`。相同路径的新文件通过同目录临时文件原子替换，旧哈希资源不删除，因此仍运行上一版 SPA 的浏览器可以继续完成懒加载。复制与合并过程会排除并清理 `._*`、`.DS_Store` 和未完成的临时资产。

确认 `index.html` 和 assets 后，脚本通过 Node 的同文件系统 `rename` 原子切换 `/var/www/glfans/current` 软链接。Nginx 从 shared 目录提供 `/assets/`，HTML 明确返回 `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`；哈希资源继续长期缓存，静态 4xx/5xx 会连同 UA 写入 glfans access log，成功的静态请求不额外增加日志。脚本不会删除旧版本，也不会接触其他站点目录。回滚时将一个经过核对的旧发布目录链接为临时链接，再原子替换 `current`；不要直接覆盖 `current` 中的文件。

## 6. 配置 glfans 独立 MySQL 备份

备份脚本硬编码只导出 `glfans` 库，使用只读的 `glfans_backup@127.0.0.1`，密码仅存于 root-only MySQL `defaults-extra-file`；命令行、日志和 systemd unit 均不出现密码：

```bash
sudo install -o root -g root -m 0600 ops/mysql/glfans-backup.cnf.example /etc/glfans/mysql-backup.cnf
sudo install -o root -g root -m 0600 ops/backup/glfans-backup.env.example /etc/glfans/glfans-backup.env
sudoedit /etc/glfans/mysql-backup.cnf
sudo install -d -o root -g root -m 0700 /var/backups/glfans-mysql
sudo install -o root -g root -m 0750 scripts/backup-glfans-mysql.sh /usr/local/sbin/backup-glfans-mysql
sudo install -o root -g root -m 0644 ops/systemd/glfans-mysql-backup.service /etc/systemd/system/glfans-mysql-backup.service
sudo install -o root -g root -m 0644 ops/systemd/glfans-mysql-backup.timer /etc/systemd/system/glfans-mysql-backup.timer
sudo systemctl daemon-reload
sudo systemctl start glfans-mysql-backup.service
sudo systemctl enable --now glfans-mysql-backup.timer
sudo systemctl status glfans-mysql-backup.service --no-pager
sudo systemctl list-timers glfans-mysql-backup.timer --no-pager
```

脚本使用 InnoDB 一致性快照、gzip 与 SHA-256 校验，先写同目录临时文件，完整性检查通过后才原子改名；默认每天备份并保留 14 天，不会导出其他数据库。首次运行后必须检查最新文件：

```bash
sudo bash -c 'cd /var/backups/glfans-mysql && sha256sum -c "$(ls -1t glfans-*.sql.gz.sha256 | head -1)"'
sudo gzip -t "$(sudo find /var/backups/glfans-mysql -maxdepth 1 -type f -name 'glfans-*.sql.gz' -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)"
```

至少在上线后做一次隔离恢复演练：新建临时库 `glfans_restore_check`，把最新 dump 导入该库，检查表数量与关键统计后再删除临时库，绝不能直接覆盖生产 `glfans`。服务器本地备份只能防误操作和单库损坏，不能防整机或磁盘故障；接入 COS/另一台主机的异地加密副本仍是独立待办。

## 7. 建立独立 Certbot 边界

服务器默认的 `/etc/letsencrypt` 含有旧版与新版 Certbot 的混合状态，glfans 不读取、扫描、复制或改写它。glfans 只使用下面四个独立路径：

- ACME webroot：`/var/www/letsencrypt-glfans`
- 配置和证书：`/etc/letsencrypt-glfans`
- 工作目录：`/var/lib/letsencrypt-glfans`
- 日志目录：`/var/log/letsencrypt-glfans`

服务器已核验 Snap 版 Certbot 5.8。若 `/snap/bin/certbot` 尚不存在，先安装；后续不能改用 `/usr/bin/certbot` 或无绝对路径的旧命令：

```bash
sudo snap install certbot --classic
/snap/bin/certbot --version
```

版本输出应为 `certbot 5.8.x`。`--version` 不读取证书配置；所有签发、续签和演练命令则必须同时带上独立的 `--config-dir`、`--work-dir` 与 `--logs-dir`。

创建独立目录：

```bash
sudo install -d -m 0755 /var/www/letsencrypt-glfans
sudo install -d -m 0700 /etc/letsencrypt-glfans
sudo install -d -m 0700 /var/lib/letsencrypt-glfans
sudo install -d -m 0700 /var/log/letsencrypt-glfans
```

## 8. 首次签发与启用 HTTPS

先确认 `glfans.com` 和 `www.glfans.com` 都解析到本机，再安装只属于 glfans 的 bootstrap 虚拟主机：

```bash
sudo test ! -e /etc/nginx/sites-available/glfans.com.conf
sudo install -m 0644 ops/nginx/glfans-bootstrap.conf.example /etc/nginx/sites-available/glfans.com.conf
sudo ln -s /etc/nginx/sites-available/glfans.com.conf /etc/nginx/sites-enabled/glfans.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

`test ! -e` 是防覆盖保护；如果文件已经存在，应先阅读和备份，不能盲目重跑。Bootstrap 仅通过 `/var/www/letsencrypt-glfans` 提供 HTTP-01 challenge，不修改其他虚拟主机。

用 Certbot 5.8 申请一张同时覆盖裸域与 `www` 的独立证书。首次运行按提示填写证书通知邮箱并接受条款：

```bash
sudo /snap/bin/certbot certonly \
  --config-dir /etc/letsencrypt-glfans \
  --work-dir /var/lib/letsencrypt-glfans \
  --logs-dir /var/log/letsencrypt-glfans \
  --webroot --webroot-path /var/www/letsencrypt-glfans \
  --cert-name glfans.com \
  -d glfans.com -d www.glfans.com
```

确认 `/etc/letsencrypt-glfans/live/glfans.com/fullchain.pem` 与 `privkey.pem` 存在后，备份 bootstrap 文件，再用 `ops/nginx/glfans.conf.example` 替换这个**同名 glfans 配置**。最终配置不引用默认 `/etc/letsencrypt` 的证书、TLS snippet 或 DH 参数；它会把 HTTP 和 `www` 统一 301 到 `https://glfans.com`，并提供 SPA fallback、静态缓存、安全响应头、GLB/WASM MIME 及 `/api/` 反向代理。

最终配置在 Nginx `http` include 顶层声明 glfans 专属 `glfans_api_req` / `glfans_api_conn` zone，只对 `/api/` 生效：同一公网 IP 平均 10 请求/秒、允许 30 请求突发，最多 20 个并发连接，超限返回 429。该边界不会复用或改变其他站点的限流 zone；应用内部的登录、评论和投稿限流继续保留。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 9. 独立自动续签

安装 glfans 专用 deploy hook、service 和 timer；文件名与目录均不复用系统现有 Certbot 单元：

```bash
sudo install -d -m 0755 /usr/local/libexec/certbot-glfans
sudo install -m 0750 ops/certbot/reload-nginx.sh /usr/local/libexec/certbot-glfans/reload-nginx.sh
sudo install -m 0644 ops/systemd/certbot-glfans.service /etc/systemd/system/certbot-glfans.service
sudo install -m 0644 ops/systemd/certbot-glfans.timer /etc/systemd/system/certbot-glfans.timer
sudo systemctl daemon-reload
sudo systemctl enable --now certbot-glfans.timer
```

Service 每次只让 `/snap/bin/certbot` 扫描 `/etc/letsencrypt-glfans`，工作与日志也分别写入独立目录；只有证书实际续签后，deploy hook 才会先执行 `nginx -t`，通过后再 reload。它不会停止、启用或修改服务器原有的 Certbot timer。

用相同隔离参数完成续签演练，并真实运行 deploy hook：

```bash
sudo /snap/bin/certbot renew \
  --dry-run --run-deploy-hooks --no-random-sleep-on-renew \
  --config-dir /etc/letsencrypt-glfans \
  --work-dir /var/lib/letsencrypt-glfans \
  --logs-dir /var/log/letsencrypt-glfans \
  --deploy-hook /usr/local/libexec/certbot-glfans/reload-nginx.sh
sudo systemctl status certbot-glfans.timer --no-pager
sudo systemctl list-timers certbot-glfans.timer --no-pager
```

必须等 `nginx -t`、独立续签演练和 timer 状态都成功后，才算 SSL 配置完成。故障排查只查看 `journalctl -u certbot-glfans.service` 与 `/var/log/letsencrypt-glfans`；不要让 glfans 命令回退到默认 `/etc/letsencrypt`。

## 10. 发布验收

```bash
curl -fsS http://127.0.0.1:3100/api/health
curl -I http://glfans.com/
curl -I https://www.glfans.com/
curl -I https://glfans.com/
curl -I https://glfans.com/assets/glfans-favicon-brush.png
```

验收标准：

- HTTP 与 `www` 最终都到 `https://glfans.com/`，没有落到其他站点证书或页面；
- 首页、About、Admin 及其他栏目都显示并链接备案号 `京ICP备2025151071号-4`；
- 刷新非首页路径不会由 Nginx 返回 404；
- `/api/health` 经公网域名和本机 upstream 均正常，API 未直接暴露公网端口；
- `systemctl is-active glfans-api.service` 成功，进程用户是 `glfans`，当前 release 与静态站分别可回滚；
- MySQL session 时区为 `+00:00`，迁移连续执行两次无错误，导入后的公开条数与聚合统计和最终快照一致；
- `glfans-mysql-backup.timer` 已启用，首次 dump 的 gzip 与 SHA-256 校验通过；
- `index.html` 使用短缓存，带 hash 的 JS/CSS 使用长期缓存，GLB/WASM Content-Type 正确；
- 桌面和手机的中文、英文、泰文路由都能载入，点赞、评论和后台写入再单独做真实数据验收。

备案号固定链接到工信部备案系统：`https://beian.miit.gov.cn/`。
