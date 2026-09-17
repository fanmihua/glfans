# glfans iOS

SwiftUI 原生 iPhone App，最低 iOS 17。当前在独立的 `codex/ios-store-preparation` 工作树准备 App Store 发布，网站源码与 iOS 工程分别维护。网站发布不会上传 App 安装包；当前版本尚未提交 App Store 审核，也未上架。发布范围见 [RELEASE.md](RELEASE.md)。

## 当前开放范围

底部导航依次为考古档案、百家饭、REPO、表情包。播出日历从档案进入，关于、隐私说明和联系支持作为辅助页面保留。文学、电台、开屏及评论、点赞、投稿等社区功能关闭；旧源码保留供维护，但不会通过远程内容恢复入口。

界面沿用网站的纸张、黑粉配色、图标路径、字体、图片与固定译文，并使用原生安全区、键盘、分享与权限行为。百家饭当前覆盖 51 对 CP，保留成员资料、共同作品、时间线、公开通告、音乐／影像、活动和“她们的娃”；超话与商店入口不进入本次快照。REPO 过滤隐藏合集与隐藏文章，保留公开文章的原始图文顺序、粗体、引用和链接。

日历与业务弹窗采用贴底通栏容器；关注筛选保存在本机。中文日历使用北京时间，英文与泰语使用泰国时间，缺失的播出时刻不补造。表情包保存时才请求添加照片权限，不读取相册，也不使用相机。英泰界面与不同尺寸仍需按实际页面逐项验收，编译通过不等于视觉验收完成。

## 网站内容同步

网站每次 `npm run build` 都生成 `/app-content/v1/manifest.json`，与网页同一发布一起部署。App 从 `https://glfans.com/app-content/v1/manifest.json` 检查版本；剧集、排期、CP 资料、REPO、表情包素材、图片及译文可随网站发布更新，无需为每次资料变化重新发布 App。

manifest 使用 `schemaVersion: 1`，包含内容摘要 `version`、`generatedAt`、`sourceCommit`，以及 `files` 和 `assets`。九个数据文件键为 `catalog`、`cpCatalog`、`schedule`、`en`、`th`、`calendarZh`、`calendarEn`、`calendarTh`、`sourceContent`。每个文件和图片都有 `{url, sha256, bytes}`；地址限定为 `https://glfans.com/assets/app-content/<sha256>.<ext>`，SHA-256 使用小写十六进制。图片映射保留原 `assets/...` 键。内容相同的重复构建保持同一 `version`，构建时间与提交号不影响内容摘要。

App 启动和回到前台时检查更新；同次运行中，成功检查后的自动检查至少间隔一小时。没有后台每小时定时任务。关于页可手动刷新；失败后自动重试有 60 秒退避。所有九个 JSON 的来源、字节数、摘要和结构验证成功后，才整体保存并替换当前快照，避免混用不同版本。

断网或验证失败时继续读取最近完整缓存；没有缓存时使用包内快照。图片按需下载、校验并缓存；包内相同版本的图片可直接读取。远程新增或替换且尚未缓存的图片在离线时可能显示占位，不回退为同路径的旧图片。外部官方资料链接仍需网络。

## 工程与打包范围

- `Glfans/`：原生界面、完整内容快照与图片缓存；当前入口由客户端公开栏目白名单控制。
- `GlfansCore/`：可独立测试的内容模型、manifest 校验、图文解析、日历与时区规则。
- `Scripts/content-manifest.mjs`：读取指定网站构建产物，验证九个数据文件及全部图片。
- `Scripts/prepare-content.mjs`：生成 `Generated/`，包含原始 JSON、`content-manifest.json`、对应图片及本地 `native-copy.json`；macOS 使用 `sips` 生成 WebP 的 PNG 副本。暂存目录完成后原子替换，不改写 manifest 对应的原始文件字节。
- `Scripts/sync-cp-content.mjs`：兼容入口，调用完整内容同步，不再单独维护 CP 快照。
- `Config/App.xcconfig`：可公开默认配置；`Config/Local.xcconfig` 仅用于本地签名等覆盖，不作为 App 资源，不得写入服务端密钥。
- `GlfansUITests/`：公开栏目、日历关注、表情包及多语言操作检查。

`Generated/`、`.Generated-*/`、`Generated.previous/`、旧 `Content/` 快照、本地配置、生成的 Xcode 工程、DerivedData、`ReleaseArtifacts/` 和验收输出均由 `ios/.gitignore` 排除。项目的 App 源与资源入口仅为 `Glfans/` 和 `Generated/`；同步脚本仅复制 manifest 列出的内容和 `native-copy.json`，不复制整个工作树或发布归档。

## 本地构建与维护

需要 Node.js、XcodeGen、完整 Xcode 与可用的 iOS Simulator runtime。以下命令从 iOS 工作树的仓库根目录运行；`GLFANS_WEB_ROOT` 必须明确指向当前要发布的网站工作树，不能省略或指回旧 iOS 草稿中的网站副本。

```sh
export GLFANS_WEB_ROOT=/path/to/current/glfans-web
(cd "$GLFANS_WEB_ROOT" && npm run build && node --test tests/app-content.test.mjs)
node ios/Scripts/prepare-content.mjs
xcodegen generate --spec ios/project.yml
swift test --package-path ios/GlfansCore
xcodebuild -project ios/Glfans.xcodeproj -scheme Glfans \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/DerivedData \
  GLFANS_WEB_ROOT="$GLFANS_WEB_ROOT" CODE_SIGNING_ALLOWED=NO build
```

网站首次使用前需安装其依赖。默认读取 `$GLFANS_WEB_ROOT/dist/client`；`GLFANS_APP_CONTENT_ROOT` 仅用于明确指定另一份完整构建产物进行验证。Xcode 的 pre-build 同样运行 `prepare-content.mjs`，因此 GUI 构建或归档时也必须向构建脚本提供 `GLFANS_WEB_ROOT`，缺少变量会直接失败。

网站部署后可执行 `node ios/Scripts/verify-live-content.mjs --output=/absolute/path/report.json` 验证实际 HTTPS、九个 JSON、缓存恢复和抽样图片；该检查不替代 App 生命周期、UIKit 图片展示或真机操作验收。网站发布需保留旧版本 `/assets/app-content/` 哈希资源，使已有客户端快照仍能下载图片。

模拟器支持 `--section archive|cp|repo|memes`、`--locale zh|en|th`，百家饭可加 `--cp namtanfilm`。默认进入档案，隐藏栏目参数回退到档案。客户端导航、交互能力或不兼容数据协议的变更需要重新构建并发布 App；单纯发布远程内容不能恢复文学、电台或社区功能。

## 安装与发布状态

历史开发版曾在 iPhone 13 Pro Max 安装并确认打开；本次版本的构建、真机／模拟器验收、签名归档、上传及审核结果分别记录，不能以旧版安装记录替代本轮验证。最低版本按 iOS 17 编译，其他设备、旧系统及大字号的验收以本次记录为准。

本地安装需要可用开发签名和允许开发的设备；账户登录、设备信任和开发者模式由本人处理。本轮已授权准备归档和上架材料，旧版“仅本地、禁止提审”的阶段限制不再适用。内容权利声明、隐私资料和商店审核状态仍需按实际证据填写；生成归档、上传、提交审核、审核通过及正式上架是不同状态。
