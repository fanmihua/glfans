# glfans 自托管社区 API

这是只监听 `127.0.0.1:3100` 的 Node.js 22 单实例服务。浏览器只访问同源 `/api/`，Nginx 负责 HTTPS 和反向代理；MySQL 密码与管理员密码不会进入 Vite 构建。

## 初始化与运行

1. 参考 `server/config.example.env` 在服务器进程环境中配置数据库与安全变量。应用数据库账号只授予 `glfans.*` 的 `SELECT, INSERT, UPDATE, DELETE`；migration 账号可以临时单独提供。
2. 执行 `npm ci && npm run db:init`。migration 带 checksum 且 seed 使用 `INSERT IGNORE`，可重复执行，不会覆盖后台已经编辑过的原话。
3. 在当前 shell 临时提供 `GLFANS_ADMIN_EMAIL` 与 `GLFANS_ADMIN_PASSWORD`，运行 `npm run db:admin`。密码使用 Node `scrypt` 加盐保存，脚本不打印明文或 hash。
4. 执行 `npm run test:server`，再用进程管理器以非 root 用户运行 `npm run start:api`。
5. 本机检查 `curl -fsS http://127.0.0.1:3100/api/health`，公网只应通过 `https://glfans.com/api/health` 访问；不要开放 3100 端口。

每条 MySQL 连接都会先执行 `SET time_zone = '+00:00'`，健康检查也会断言 session 时区为 UTC；这样数据库端 `NOW(3)` / `CURRENT_TIMESTAMP` 与 Node 传入的 Date 不会受服务器系统时区影响。

进程启动和每六小时会删除过期会话、旧登录记录、旧限流桶，以及没有会话也没有任何互动的空访客身份。已产生评论、原话、点赞或浏览的身份不会被清理。优雅退出支持 `SIGINT`/`SIGTERM`。

## 统一响应与会话

成功响应是 `{ "data": ... }`；错误响应是 `{ "error": { "code", "message", "requestId" } }`。发生限流时返回 `429` 和 `Retry-After`。

先 `POST /api/session` 获取 HttpOnly、Secure、SameSite=Lax cookie 和响应体内的 `csrfToken`。页面刷新后再次调用它会延长会话并返回同一会话绑定的 token，多标签页不会互相使 token 失效；管理员登录会同时轮换会话和 CSRF。除只读接口外，所有写请求都必须同时满足：

- `Origin` 位于 `GLFANS_ALLOWED_ORIGINS`；
- 带会话 cookie；
- 请求头 `X-CSRF-Token` 等于最近一次 session/login 响应中的 token。

服务器还按 HMAC 匿名化后的 IP 对新建会话、登录与公开写入做第二层限流，避免清 cookie 绕过身份限流。评论和原话仍保留产品规则：每个身份 10 分钟最多 3 条，同内容 24 小时内不可重复。

## API contract

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/health` | API 与数据库健康检查 |
| `POST` | `/api/session` | 创建/续期访客或管理员会话，返回会话绑定的 CSRF token |
| `GET` | `/api/session` | 读取当前身份，不返回 CSRF token |
| `GET` | `/api/community/stats` | 按 `page:tide-words` / `quote:q-*` 返回评论、心动、访客、浏览统计 |
| `GET` | `/api/community/quotes` | 公开原话列表 |
| `GET` | `/api/community/reactions` | 当前身份点过心动的 target key 列表 |
| `GET` | `/api/community/comments?targetType=quote&targetId=q-01&limit=50` | 指定目标的公开评论 |
| `POST` | `/api/community/views` | body: `{ targetType, targetId }`；同身份 30 分钟内不重复增加浏览 |
| `POST` | `/api/community/reactions/toggle` | body: `{ targetType, targetId }`；返回 `{ liked, likes }` |
| `POST` | `/api/community/comments` | body: `{ targetType, targetId, nickname, body }` |
| `POST` | `/api/community/quotes` | body: `{ speaker, text }`；投稿立即公开 |
| `POST` | `/api/admin/login` | 先建访客 session，再带 CSRF 提交 `{ email, password }` |
| `POST` | `/api/admin/logout` | 注销管理员并立即换成新的访客会话 |
| `GET` | `/api/admin/session` | 验证管理员权限 |
| `GET` | `/api/admin/dashboard` | 一次读取 comments、quotes、stats |
| `GET` | `/api/admin/comments?status=published&limit=100&offset=0` | 管理员评论列表；status 可为 `pending/published/hidden/all` |
| `PATCH/DELETE` | `/api/admin/comments/:id` | 编辑 `nickname/body/status`，或永久删除 |
| `GET/POST` | `/api/admin/quotes` | 列表或新增草稿/原话 |
| `PATCH/DELETE` | `/api/admin/quotes/:id` | 编辑 `text/speaker/cover_path/sort_order/status/is_pinned`，或永久删除及其互动 |

所有 SQL 动态值都通过 prepared query 传入；动态更新列也只来自服务端白名单。管理员权限来自本地 `community_identities.kind/role/is_active`，不依赖 Supabase UUID。

## 从 Supabase 导入

`npm run db:import -- /absolute/path/community-export.json` 在一个事务中 upsert，格式见 `db/community-import.example.json`。公开 API 拿不到匿名用户、心动、浏览明细时：

- 22 条公开原话和 3 条公开评论按真实记录导入；公开评论的 `identity_id` 保持 `NULL`，不伪造用户；
- 每个 target 的旧心动/独立访客/浏览量写入 `community_stat_baselines`；
- API 统计 = baseline residual + MySQL 中的真实明细增量。

导入文件必须明确 `baseline_mode`：

- `residual`：数值已经是不在同文件明细中的剩余量；例如评论逐条导入后，对应 baseline `comment_count` 通常是 0。
- `totals`：数值是快照总量；导入器会减去同文件中公开 comments、唯一 reactions、唯一 visitor views 及 view_count，写入差额。若明细大于总量会整批回滚。

以后拿到完整 dump 时，可在同一格式中加入 `identities/reactions/views` 并重复导入；这些身份保持 visitor，本地管理员绝不从 Supabase 导入。若完整明细已覆盖旧聚合值，要把相应 baseline 以 `residual` 模式更新为 0，避免重复计数。

## 测试

`npm run test:server` 覆盖密码散列、Secure cookie、会话与 CSRF、Origin 拒绝、社区写入、统计 contract、管理员登录和隐藏/恢复路径。真实 MySQL 上线前还应在空的 `glfans` 数据库连续运行两次 `npm run db:init`，再做一次导入、前台写入与后台恢复/删除的冒烟测试。
