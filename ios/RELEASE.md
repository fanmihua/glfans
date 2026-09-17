# iOS 发布说明

本轮准备版本为 `1.0.0 (2)`，最低 iOS 17。2026-09-17 已上传 App Store Connect，Apple 处理完成，TestFlight 状态为 Ready to Submit。当前尚未提交正式 App Store 审核，也未上架；上传和处理完成不能表述为审核通过。

- **公开功能：**考古档案（含播出日历）、百家饭、REPO、表情包，按此顺序组成四项导航；关于、隐私与联系支持保留。文学、电台、开屏、评论、点赞、投稿关闭，隐藏合集／文章不进入内容快照。百家饭不包含超话和商店入口。
- **同源内容：**网站每次构建与发布生成 `https://glfans.com/app-content/v1/manifest.json`。协议为 `schemaVersion: 1`，含 `version`、`generatedAt`、`sourceCommit`、九项 `files` 和图片 `assets`；每项为 `{url, sha256, bytes}`，URL 指向同源 `/assets/app-content/<sha256>.<ext>`。SHA-256 为小写十六进制；相同内容保持同一版本摘要，旧哈希资源跨网站版本保留。
- **构建要求：**显式设置 `GLFANS_WEB_ROOT` 指向当前网站发布工作树，先完成网站 `npm run build`，再同步 iOS 内容、生成工程和构建／归档。Xcode pre-build 也依赖该变量。包内保留完整快照与图片作为首次离线兜底，不从旧 iOS 工作树的网站副本导出。
- **更新与失败行为：**启动、回到前台时自动检查；成功检查后同次运行至少间隔一小时，非后台定时更新。关于页支持手动刷新；自动失败重试退避 60 秒。九个 JSON 完整校验后整体激活，失败保留上次完整缓存或包内数据。图片按需校验缓存，尚未缓存的新图片离线时可能显示占位。
- **维护边界：**公开栏目内的文章、剧集、CP、排期、译文与素材随网站发布更新，通常无需 App 发版。恢复隐藏模块、增加交互能力或变更不兼容协议必须修改客户端并发布新版本，不以远程内容开启隐藏能力。
- **打包与核验：**仅 `Glfans/` 和 `Generated/` 为 App 源／资源入口；本地签名配置、暂存内容和发布归档不打入资源，且不纳入 Git。依次核验内容导出测试、Swift 核心测试、实际 App 操作、生产 HTTPS feed，再记录签名归档、上传和审核状态。权利声明与商店表单按已获授权及实际内容填写，未确认项不代为声明。

具体命令、离线图片限制与维护路径见 [README.md](README.md)。

## 2026-09-17 构建与商店准备结果

- 网站独立分支 `codex/filing-preparation` 已发布 `f8ae9b26a64262f7dcb96a52a715618daf61b922`；生产资料为 75 部剧、613 条排期、51 对 CP、5 个合集／20 篇文章、5 张表情包。九个 JSON 和 340 张图片的线上字节数与摘要均验证通过。
- Swift 核心测试 17 项通过；模拟器日历、四项导航、英泰界面、在线刷新和表情包操作通过。隐藏栏目参数的批量测试曾有一次失败，独立重跑三个关闭入口均通过。模拟器构建和签名 Release archive 成功。
- `ReleaseArtifacts/Glfans-1.0.0-2.xcarchive` 已用 Xcode 上传；Apple 页面显示上传 Complete、Build 2 为 Ready to Submit。未新建外部测试分发；内部测试组由既有设置自动关联。
- App Store 草稿已有中文描述、关键词、支持与营销地址、版权、审核说明和用户提供的审核联系方式。五张 1284×2778 真实截图依次展示档案、日历、百家饭、REPO、表情包。免费定价，沿用页面默认全部地区（包含中国大陆），关闭本轮未验证的 Mac 与 Vision Pro 分发。
- 隐私标签已在用户明确确认后发布：服务访问日志归 Other Data Types，错误日志归 Other Diagnostic Data；用于 App Functionality、与身份关联、不追踪。与线上隐私页及包内隐私清单保持一致。
- 构建 2 已关联并保存到正式版本草稿；再次实际尝试 Add for Review 后，校验仅列出年龄分级与内容权利信息两项未完成。年龄与权利仍待下述内容范围／授权信息决定。没有填写虚构 ICP 备案号，也没有因未备案而排除中国大陆；当前表单未阻挡 ICP 不等于中国大陆上架已获准。
- 每周一北京时间 10:00 的既有网站资料任务已恢复，日历发布改用备案分支，网站发布同时更新 App feed；CP 资料维护仍遵循既有本地核对边界。

## 2026-09-17 内容年龄审查记录

审查基于包内 `Generated/catalog.json`，内容版本 `e6c935ed70a7f5871387d79e8a7c73a9834f3ba017c895ad26d77500346b97c7`。范围为 75 部剧简介、20 篇 REPO 的关键词与上下文、205 张去重海报／REPO／表情包缩略图，以及重点原图。此记录是本地风险判断及问卷建议，**不是 Apple 已拒绝或已批准的结论**，不把 GL 题材本身归为成人内容。

文章源文件为网站工作树 `src/data/column-data.json`，包内对应 `Generated/catalog.json` 的 `collections[].articles[].xml`。下表路径为“合集 slug / 文章 slug”；段落号从该篇 XML 的第一个 `<p>` 起按源顺序计数，包含空段落，不按屏幕换行计数。

| 需优先人工复核的文章路径 | 段落与 XML id | 风险描述 |
| --- | --- | --- |
| `us/unsaid-fragments-ep07` | 第 79 段 `TFJ0dwR3WoKgMCx9niycgryvn2c`；第 86 段 `Bd1ZdDvgFoSxYTxWIcscvPZAnxf` | 连续、具体的性行为与身体反应描写，超出一般恋爱暗示。 |
| `us/unsaid-fragments-ep08` | 第 49 段 `OMuadJjv3o2iGOxYT3Kc3ZX1nZb` | 具体动作与高潮过程描写。 |
| `us/unsaid-fragments-ep12` | 第 58 段 `A73fdiUH8oZZxbxWCkEc4JPHnse` | 以隐喻表达身体部位，并连续描述具体性行为。 |

Apple [审核指南 1.1.4](https://developer.apple.com/app-store/review/guidelines/#objectionable-content) 的范围包含露骨文字描写；[年龄分级定义](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions) 将露骨性内容的任何频次列入不能在 App Store 发布的 Unrated。上述三篇有触及该边界的风险，不能仅以选 18+ 视为问题已解决，最终适用由 Apple 审核判断。网页和 App 的隐藏范围已向用户询问，尚待确认；本记录未改动或删除原稿，未代填商店问卷。

| 问卷内容项 | 暂定频次 | 当前实际证据 |
| --- | --- | --- |
| 粗口／低俗幽默 | 偶尔 | `affair/repo-08` 第 6 段有粗口缩写。 |
| 恐怖／惊吓 | 偶尔 | `dramas[id=runaway]` 的恶灵简介与海报；`dramas[id=khom-khlang]` 的超自然题材与海报。 |
| 酒烟药使用／提及 | 偶尔，不能填无 | `us/unsaid-fragments-ep02` 第 92、109 段，EP03 第 90 段及 `designing-love/monologue-01` 第 3 段有饮酒／醉酒；`rak-overdose`、`dangerous-queen` 简介提及成瘾。未见明确吸烟证据。 |
| 成熟／暗示主题 | 频繁 | 多篇亲密描写；`affair/repo-07` 第 5、7 段有自杀、家庭创伤及疑似乱伦误会等讨论。 |
| 性内容／裸露 | 频繁 | 多篇 REPO 有亲密行为文字；`assets/column/us/unsaid-fragments-ep07/01-a918969464b8.webp` 为床上裸肩拥抱，`assets/column/affair/repo-07/02-fa0tbhpjvopa.webp` 为淋浴亲密画面。巡检未见裸露性器官。 |
| 露骨性内容 | 至少有需人工判定的实例，暂不完成申报 | 上述三篇具体段落；先确定最终公开内容，再重评此项。 |
| 卡通／幻想暴力 | 本轮未见 | 五张表情包未见相关内容；不能将普通卡通形象直接计入暴力。 |
| 现实暴力 | 偶尔 | `us/unsaid-fragments-ep07` 第 54 段明确描述父亲殴打女儿；部分剧集简介提及暗杀、追杀。 |
| 持续血腥／虐待暴力 | 本轮未见 | 已巡检图片未见血腥或长时间施虐；普通冲突与本项分开。 |
| 枪械／其他武器 | 偶尔 | `assets/archive/posters/only-you.webp`、`mission-love-or-lies.webp` 有持枪；`affair/repo-08` 第 6 段提及枪击。 |

频次按当前整体资料站判断，Apple 定义页未给出统一数量阈值；若隐藏文章或更换素材，应基于最终 feed 重新核对。此次没有全面核验英泰译文及所有外链目标；glspotlight 抽样目标未能通过浏览工具读取。App 在外部打开指定链接，本身不等于 App 内无限制网页浏览，但不能据此宣称外链内容已全部通过。内容权利授权仍待用户确认，不据此代作权利声明。
