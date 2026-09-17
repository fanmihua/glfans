# 备案公开范围的发布与恢复

本分支公开考古档案、播出日历、百家饭及必要站点说明。原始代码、素材、历史静态版本、社区数据库和 API 进程继续保留。此发布范围不构成备案通过的保证。

## 发布

先暂停 Codex 中 `glfans` 每周自动任务：其旧指令从 `origin/main` 构建并运行主线旧部署脚本，可能覆盖备案前端。2026-09-17 已检查 GitHub Pages workflow 仅手动触发；服务器仅有独立证书续期和数据库备份 timer。

构建、测试及浏览器验收完成后，从本分支运行：

```bash
GLFANS_FILING_MODE=1 GLFANS_RELEASE_ID=已核对的唯一版本号 bash scripts/publish-static-vps.sh dist/client
```

发布器要求 `filing-build.json` 声明 `mode: filing`、仅公开 `archive/cp/about`，并关闭 `communityEnabled` 与 `radioEnabled`；也会检查产物不存在隐藏目录与组件 chunk。

服务器只为现有 `/etc/nginx/sites-available/glfans.com.conf` 添加一行 `include /var/www/glfans/shared/filing-policy.conf;`。策略在 `server` 层执行，先限制旧入口，再原子切换 `current`：

- `/api` 及 `/api/` 下的读写接口返回 404，仅放行精确的 `/api/health`、`/api/wechat/jssdk-signature`。
- `/home`、`/column`、`/memes`、`/radio`、`/tide-words`、`/admin`、`/polaroid-lab` 及其子路径返回 404。
- `/assets/column`、`fan-memes`、`meme-game`、`pit-radio` 下的旧资源，以及隐藏页面、文章译文、社区客户端的具名 chunk 返回 404。
- 档案、CP、通用旧 hash 资源和共用纸张/装饰素材保留。哈希路由由新前端返回考古档案，哈希本身不会发送到 Nginx。

`nginx -t` 通过才 reload。失败时恢复之前的 glfans 配置与策略，`current` 保持；不重启 API、不写数据库、不触碰其他站点配置。配置原件保存在 `shared/filing-backups/<release-id>/`，每个备案 release 同时保存 `.glfans-filing-policy.conf` 以便审计。策略激活后，本分支脚本拒绝没有 `GLFANS_FILING_MODE=1` 的发布。

2026-09-17 只读核验：API 仅监听 `127.0.0.1:3100`，UFW 对 IPv4/IPv6 的 `3100/tcp` 都是 DENY。上线后仍需检查根页面、archive/calendar/cp、隐藏直达路径、旧 hidden chunk、社区读写接口的真实状态码，并确认 health 为 `data.status=ok`、`data.database=connected`。

## 恢复

日常修订继续从备案分支发布。恢复全部功能须作为一次明确的完整站点发布决定；不要仅恢复定时任务。只切换旧静态 release 不会移除 Nginx 限制。

以下命令只供审查，在服务器使用；先把两个版本号替换为已核对值。`filing_id` 必须是首次启用限制的发布，其 `nginx-before.conf` 不应含 filing include；`full_id` 必须是计划恢复的完整站点 release。首次限制前的线上版本为 `0b26a29-us-ep03-12-20260916`。恢复失败会自动恢复执行前的配置和静态链接，备份保留。

```bash
set -euo pipefail
site=/var/www/glfans
filing_id=替换为首次备案发布版本号
full_id=替换为已核对的完整站点版本号
[[ "$filing_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ && "$full_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]
config=/etc/nginx/sites-available/glfans.com.conf
original="$site/shared/filing-backups/$filing_id/nginx-before.conf"
test -f "$original" && test -f "$site/releases/$full_id/index.html"
! grep -q 'filing-policy.conf' "$original"
before=$(readlink -f "$site/current")
save=$(mktemp -d "$site/shared/.filing-restore-XXXXXXXX")
cp "$config" "$save/nginx-before.conf"
switch_current() {
  ln -s "$1" "$site/.restore-current-$$"
  mv -Tf "$site/.restore-current-$$" "$site/current"
}
rollback() {
  trap - ERR
  cp "$save/nginx-before.conf" "$config.restore-$$"
  mv -Tf "$config.restore-$$" "$config"
  switch_current "$before"
  nginx -t && systemctl reload nginx
  exit 1
}
trap rollback ERR
cp "$original" "$config.restore-$$"
mv -Tf "$config.restore-$$" "$config"
nginx -t
switch_current "$site/releases/$full_id"
systemctl reload nginx
mv "$site/shared/filing-policy.conf" "$save/filing-policy.conf"
trap - ERR
```

随后确认完整页面与社区接口符合本次恢复范围，再决定是否恢复 `glfans` 自动任务。保留恢复目录与旧 release，不删除数据库或原始素材。
