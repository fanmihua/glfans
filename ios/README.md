# glfans iOS

SwiftUI 原生 iPhone App，最低 iOS 17。当前在独立 `codex/ios-app` 工作树开发，先个人使用，保留未来 App Store 发布方向。不会随网站构建或 Pages 部署上传。

## 当前状态：开发暂停

2026-09-09 按用户要求保存并推送当前 iOS 工程，暂停开发。当前停止在开屏四个阶段；后续页面保留草稿，等待另行确认后继续。尚未进行 App Store 发布。

## 当前验收范围

2026-09-09 起按真实访问顺序，从正式网站移动端开屏进行源码转换。已覆盖开屏、两眼一闭、下坠、坑底索引；原五张 CP 卡、坑口、字体、图标、三种语言与六个索引入口均来自网站。iPhone 13 Pro Max / iOS 26.3.1 模拟器的四项开屏交互测试和七项内容核心测试通过。

开屏以外的栏目仍是原生草稿，不能据此称整站样式或全部功能验收完成。旧 `GlfansUITests` 仍包含已过时的系统 TabBar 断言；本轮只运行新的 `HomeJourneyUITests`。开发计划、源码映射记录和视觉验收截图仅保留在本地。

## 工程

- `Glfans/`：原生界面、内容缓存、URLSession 社区客户端、Keychain 会话、AVPlayer 和系统播放控制。
- `GlfansCore/`：可独立测试的内容模型、图文解析、日历合并与时区规则、文本校验。
- `Scripts/prepare-content.mjs`：从当前检出的正式网站内容生成 App 目录、排期、固定译文和原始素材的 PNG 版本。隐藏文章不会进入包内。
- `Config/App.xcconfig`：可公开的默认配置。`Local.xcconfig` 保存当前部署的公开客户端配置与个人签名覆盖，已忽略；不得填入 Supabase 服务端密钥。
- `GlfansUITests/`：页面导航、日历关注、表情出片和英泰界面的操作检查，仅读取社区，不发布内容。

## 本地构建

需要 Node.js、XcodeGen、完整 Xcode 与一个可用 iOS Simulator runtime。

```sh
node ios/Scripts/prepare-content.mjs
xcodegen generate --spec ios/project.yml
swift test --package-path ios/GlfansCore
xcodebuild -project ios/Glfans.xcodeproj -scheme Glfans \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO build
```

图片格式转换由 macOS `sips` 执行。内容与图片打包后可离线阅读；电台和社区需要网络。模拟器可用 `--section archive|literature|repo|memes|radio` 和 `--locale zh|en|th` 启动指定页面，未传参数则从入坑首页开始。

## 现有草稿覆盖的功能（仍须逐页验收）

- 首页入场、档案年份与剧集横向胶卷、详情、搜索、播出日历、选剧及关注筛选。
- 日历从正式仓库 `main` 刷新公开排期，当前记录覆盖历史记录，保留待核实状态并从公开日历过滤。失败继续显示本地已保存数据；中文按北京时间，英文／泰语按泰国时间，日期不补造播出时刻。
- 文学显示服务端原话与真实统计；无网络时有本地内容兜底。数字、原话和个人互动状态分别加载。提供排序、拖动次序、置顶显示、评论阅读与发布、原话投稿及本地隐藏。开发验证不点击正式服务的发布或点赞操作。
- REPO 的完整可见图文原生解析为 SwiftUI，保持原图文顺序、粗体、引用和可用链接，支持图片放大、下一篇与分享原网页地址。
- 表情包沿用现有素材和页面开放的保存行为，提供逐张出片／显影／收集，保存到相册时才请求添加照片权限；不访问相机。
- 电台按 CP 维护歌曲队列，用 AVPlayer 播放现有音源，支持前后切歌、单曲循环、播放列表、进度、跨栏目迷你播放器、后台与锁屏控制、音频中断和耳机断开处理。
- 简中／英文／泰语复用网站固定译文与经核对的人名剧名，补充原生操作译文；原图和未收录译文的新增投稿保持原文。

## 兼容与安装边界

当前重点验证机型为 iPhone 13 Pro Max；真机安装与运行尚待验证。最低 API 按 iOS 17 编译，界面支持安全区、滚动阅读与减少动态；不同设备及大字号的实际验收状态以本地验证记录为准。

本地个人安装需要 Xcode 中的 Apple 账户、可用开发签名和已连接且允许开发的设备。Apple 账户登录、手机信任和开发者模式需要本人操作。免费 Personal Team 有有效期限制，不能把一次开发安装当作永久分发；具体限制以 Apple 当前说明为准。

## 后续正式发布

当前仅推送源码，不上传 App Store、不提审、不发布安装包。App Store 发布前仍须完成真机与旧系统覆盖、音频来源可用性及权限核实、内容与权利复核、隐私申报、社区举报／屏蔽／账户生命周期设计和适用的上架材料。这些发布事项不替代本轮的本地构建与使用验证，也不把个人版称为已可上架版本。

官方参考：[个人开发账户](https://developer.apple.com/help/account/basics/about-your-developer-account)、[Xcode 系统支持](https://developer.apple.com/xcode/system-requirements)、[SwiftUI 导航](https://developer.apple.com/documentation/swiftui/navigation)。
