# 备案公开范围的发布与恢复

本分支公开考古档案、播出日历、百家饭、REPO、表情包及必要站点说明。坑底文学、评论、投稿、点赞、电台、后台和欢迎开屏保持关闭。原始代码、素材、历史静态版本、社区数据库和 API 进程继续保留。此发布范围不构成备案通过的保证。

## 发布

先暂停 Codex 中 `glfans` 每周自动任务：其旧指令从 `origin/main` 构建并运行主线旧部署脚本，可能覆盖备案前端。2026-09-17 已检查 GitHub Pages workflow 仅手动触发；服务器仅有独立证书续期和数据库备份 timer。

构建、测试及浏览器验收完成后，从本分支运行：

```bash
GLFANS_FILING_MODE=1 GLFANS_RELEASE_ID=已核对的唯一版本号 bash scripts/publish-static-vps.sh dist/client
```

发布器要求 `filing-build.json` 声明 `mode: filing`、公开栏目顺序为 `archive/cp/column/memes/about`，并关闭 `communityEnabled` 与 `radioEnabled`；也会检查产物不存在隐藏目录与组件 chunk。脚本默认模式保持不变，备案发布显式传入 `GLFANS_FILING_MODE=1`。

同一次构建生成 `/app-content/v1/manifest.json`，App 与网页共用当前资料。发布器逐项校验 manifest 中 9 份 JSON 及图片的本站内容地址、字节数、SHA-256、整体内容版本，并核对 App 导航与网页公开栏目完全一致，文学、音频与欢迎卡片保持空。manifest 使用 `application/json` 和 `Cache-Control: no-cache`；客户端每次检查可重新验证，旧的内容 hash 地址仍由 shared assets 保留。

App 的公开说明页为 `/app-privacy/`（隐私政策）与 `/app-support/`（支持），中英文连续阅读。这两页由 `public/` 中的独立 HTML 构建，不依赖应用路由或登录。

服务器只为现有 `/etc/nginx/sites-available/glfans.com.conf` 添加一行 `include /var/www/glfans/shared/filing-policy.conf;`。策略在 `server` 层执行，先限制旧入口，再原子切换 `current`：

- `/api` 及 `/api/` 下的读写接口返回 404，仅放行精确的 `/api/health`、`/api/wechat/jssdk-signature`。
- `/home`、`/radio`、`/tide-words`、`/admin`、`/polaroid-lab` 及其子路径返回 404。
- `/assets/pit-radio` 下的旧资源，以及欢迎页、后台、电台、坑底文学、拍立得实验、社区客户端的具名 chunk 返回 404。
- `/column`、`/memes`、对应组件与文章译文 chunk、`/assets/column`、`fan-memes`、`meme-game` 素材恢复公开，社区 API 保持关闭。
- 档案、CP、通用旧 hash 资源和共用纸张/装饰素材保留。隐藏哈希路由由新前端返回考古档案，哈希本身不会发送到 Nginx。

`nginx -t` 通过才 reload。失败时恢复之前的 glfans 配置与策略，`current` 保持；不重启 API、不写数据库、不触碰其他站点配置。配置原件保存在 `shared/filing-backups/<release-id>/`，每个备案 release 同时保存 `.glfans-filing-policy.conf` 以便审计。策略激活后，本分支脚本拒绝没有 `GLFANS_FILING_MODE=1` 的发布。

2026-09-17 只读核验：API 仅监听 `127.0.0.1:3100`，UFW 对 IPv4/IPv6 的 `3100/tcp` 都是 DENY。上线后仍需检查根页面、archive/calendar/cp/column/memes、隐藏直达路径、旧 hidden chunk、社区读写接口的真实状态码，并确认 health 为 `data.status=ok`、`data.database=connected`。

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
# 2026-09-17 Us 文章范围更新

`d785e65` 发布后，Us EP07、EP08、EP12 在网页和 App feed 同时隐藏；原稿及译文仍保留在源码中。网站构建通过 `public-column-payloads` 排除隐藏正文及其独有译文，App exporter 使用同一过滤规则。Nginx 对三篇独立路径返回 404，旧 hash 入口回到合集。Us 当前 9 篇，全站公开 REPO 17 篇。恢复文章须同时调整 `hidden` 标记及发布脚本中的路径限制，并按实际内容重新核对 App 年龄分级。

## 2026-09-20 网站功能恢复

用户明确授权开放线上网站全部既有功能。网页恢复欢迎页、文学与社区互动、电台、后台登录、百家饭的电台/超话/商店入口。App 继续使用其当前审核范围；和谐密语与 Us EP07/EP08/EP12 的独立内容隐藏决定继续保留。每周任务未自动恢复。

完整构建生成 `public-build.json`；运行 `GLFANS_FULL_MODE=1 GLFANS_RELEASE_ID=已核对版本号 bash scripts/publish-static-vps.sh dist/client` 发布。发布器先校验完整组件与 App feed 的 hash，再将服务器策略更新为只保留独立文章限制和 App manifest 不缓存规则。原策略、Nginx 配置、旧静态版本均保留；策略失败会还原，静态切换失败也会还原策略。无需重启社区 API 或写入数据库。后续完整网页发布沿用 `GLFANS_FULL_MODE=1`。

## 2026-09-21 恢复已发布文章

Us EP07、EP08、EP12 恢复公开，Us 共 12 篇；网页和共用 App 内容快照同步。完整发布策略移除三篇 Us 路径拦截，保留 `/column/my-secret-words/` 及其子路径的 404。原文、译文与素材不变。
