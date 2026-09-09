# Legacy Supabase schema

这里的 SQL 仅保留为旧社区数据结构与迁移来源记录，方便核对从旧托管服务导入 MySQL 时的字段、限流和统计语义。

当前网站运行时、构建和部署均不执行这些 migration，也不连接 Supabase。现行 schema 位于 `db/migrations/`，可重复导入工具是 `scripts/import-glfans-community.mjs`，API 说明见 `server/README.md`。
