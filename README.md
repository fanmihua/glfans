# glfans

[中文](#zh) · [English](#en) · [ไทย](#th)

[主站：glfans.com](https://glfans.com/) · [GitHub Pages 回滚构建](https://github.com/fanmihua/glfans/actions/workflows/deploy-pages.yml)

<a id="zh"></a>

## 中文

> 欢迎入坑。请保管好你的理智，虽然大概率用不上。

[欢迎入坑](https://glfans.com/?lang=zh#/) · [考古档案](https://glfans.com/?lang=zh#/archive) · [坑底文学](https://glfans.com/?lang=zh#/tide-words) · [Repo 文专栏](https://glfans.com/?lang=zh#/column) · [来捡表情包](https://glfans.com/?lang=zh#/memes) · [坑底电台](https://glfans.com/?lang=zh#/radio) · [关于](https://glfans.com/?lang=zh#/about)

[参与讨论](https://github.com/fanmihua/glfans/discussions) · [提交问题](https://github.com/fanmihua/glfans/issues)

glfans 是一个正在慢慢挖的泰百小网页。

起因很简单：随便看看一部剧。

后来事情变成了：补花絮、翻采访、逐帧研究眼神、宣布退坑，以及在下一支视频出现时郑重得出结论——

> **这次真的不一样。**

所以有了这个坑。

至于这里最后会长出什么——

还没想好。先挖着。

### 现在挖到哪了

`PIT STATUS: 首页片头、考古档案、坑底文学、REPO、MEME PIT、坑底电台都已接通`

现在打开网页，能看到几条已经挖通的路：

- **考古档案**：从 2022 年开始，按首播年份翻泰国 GL 剧集胶卷，看看播出时间、剧情、演员和平台；
- **播出日历**：从档案标题下的黑色入口打开，桌面看月历，手机左右滑动周历；每天直接列出剧名、集数与时间，点开可以看封面和介绍。只展示已公布日期，状态随时间更新；中文使用北京时间，英文与泰语使用泰国时间；
- **坑底文学**：看词频潮汐，翻坑底人留下的原话，点个心动、接一句评论，也可以留下一句自己的原话；
- **Repo 文专栏**：从证据目录进入合集，再一路读到单篇图文档案；
- **来捡表情包**：按住拍立得快门，等表情包出片、显影，再横向翻相纸，下载或重拍；
- **坑底电台**：点一张 CP 贴纸，放下唱针，听听她们的歌；可以切歌、单曲循环，也可以打开当前 CP 的歌单；
- **关于这个坑**：看看是谁在挖，以及这份热爱为什么还在继续。

页面使用黑白主体、粉色高亮的独立杂志排版。手机底部有五张栏目签，原话和歌单用弹层展开，相纸可以横向滑动；电台贴纸直接标出歌曲数量，播放按钮留出好点按的位置。桌面仍保留原话卡片拖动、贴纸拖入唱片等小玩法。

换个栏目，歌还可以接着听。坑可以换，心动暂时不用停。

### 三种语言，一份内容

界面、栏目说明、剧集简介和 REPO 正文支持中文、英文与泰语。坑底文学现有原话、评论和图表词语也有固定英泰译文，仅切换显示，不覆盖原始数据；不接入持续自动翻译，未收录译文的新增或修改内容先显示原文。歌曲名称、署名、REPO 内引用及原始图片中的文字保留原文。网站自制操作说明（例如电台「怎么玩」）使用无字底图叠加可翻译文字。手机顶栏使用「中 / EN / TH」分段切换，桌面使用完整语言名下拉菜单，失焦自动关闭。切换不离开当前页面，也不重建播放和表单状态。

译文保存在 `src/i18n/`，访客不需要连接翻译服务。正文按需加载，长篇译文目前仍是需要持续校对的辅助译稿。专名优先采用制作方或发行平台写法，来源记录在 `src/i18n/proper-names.js`；尚未核实的专名保留来源写法，不编造泰语译名。

它还不是一个已经想明白的大网站。只是 Repo 写着写着，原话攒着攒着，表情包拍着拍着，坑又比昨天深了一点。

如果你突然想到点什么，或单纯觉得“这里不对”，欢迎开 [Issue](../../issues)、去 [Discussions](../../discussions) 聊聊，或者直接提交 Pull Request。

### 本地挖坑

需要 Node.js 22 或更高版本。

```bash
npm ci
npm run dev
```

生产构建与站点打包检查：

```bash
npm run build
npm run test:sites
node --test tests/*.test.mjs
```

互动功能通过本站同源 `/api` 连接服务器端 Node 服务与独立 MySQL 数据库，浏览器不再包含数据库密钥。数据库迁移位于 `db/migrations/`，服务配置与运行说明见 `server/README.md`。主站从 VPS 根路径发布到 `https://glfans.com/`，完整的 Nginx、SSL 与原子发布流程见 [VPS 部署说明](docs/VPS_DEPLOYMENT.md)。GitHub Pages workflow 继续保留，仅作为回滚构建；它通过 `VITE_BASE_PATH=/glfans/` 显式使用子路径，普通 `npm run build` 默认生成根路径版本。

日历的近期数据保存在 `src/data/archive-schedule.json`，历史日期独立保存在 `src/data/archive-history.json`，周更新不会覆盖历史。点击月份标题可选择年份与月份，无排期月份置灰，有排期月份显示去重剧集数，按当前关注筛选联动，并定位当月第一条排期；选剧支持按剧名、演员和年份搜索，点击完成后切换到关注。历史只收录来源明确的逐集日期，缺少逐集资料的剧仅展示首播。运行 `npm run sync:history` 可按已核对的剧集、季和单元映射重新获取历史；映射和首播来源在 `scripts/lib/archive-history-*`，新匹配需人工核对。维护时运行 `npm run sync:schedule` 拉取公开排期，`npm run test:schedule` 校验规则，`npm run stats:schedule` 生成本地日期与状态统计。同步失败会保留原数据，日期冲突的记录隐藏待核实；不按总集数推算未知播出日期。数据来自 [GL Spotlight](https://glspotlight.com/airing) 和 [TVmaze](https://www.tvmaze.com/api)，来源及许可见 [NOTICE](NOTICE)。数据修改需重新构建发布，定期检查本身不会自动更新线上站点。

### 坑底公约

- 嗑糖可以，造谣不行。
- 自由心证可以，替真人盖章不行。
- 考古可以，隐私不挖。
- 玩梗归玩梗，公开资料和素材尽量标明来源。
- 如果塌了，先深呼吸；如果没塌，也先别急着贷款一辈子。

### 内容与权利

glfans 是非官方、非商业的粉丝共创站。第三方素材相关权利归原权利人；站点原创版权仅覆盖原创文字、设计与代码。完整边界、反馈流程和素材台账见 [内容权利与素材管理](docs/RIGHTS_POLICY.md)，仓库授权范围见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。参与共创前请先看 [CONTRIBUTING](CONTRIBUTING.md)。

---

<a id="en"></a>

## English

> Welcome to the pit. Keep your common sense safe. You probably won’t be using it.

[Enter the Pit](https://glfans.com/?lang=en#/) · [GL Archive](https://glfans.com/?lang=en#/archive) · [Voices from the Pit](https://glfans.com/?lang=en#/tide-words) · [REPO](https://glfans.com/?lang=en#/column) · [Meme Camera](https://glfans.com/?lang=en#/memes) · [Pit Radio](https://glfans.com/?lang=en#/radio) · [About](https://glfans.com/?lang=en#/about)

[Join the conversation](https://github.com/fanmihua/glfans/discussions) · [Report an issue](https://github.com/fanmihua/glfans/issues)

glfans is a little Thai GL fan site, one that we’re slowly digging deeper.

It started innocently enough: just watching a series.

Then came the behind-the-scenes clips, the interviews, the frame-by-frame analysis of a glance, the solemn announcement that we were leaving the fandom—and, with the very next video, an equally solemn conclusion:

> **This time really is different.**

And so, here we are.

What will this place eventually become? We haven’t figured that out. We’ll keep digging.

### What’s here so far

`PIT STATUS: Home intro, GL Archive, Quotes, REPO, MEME PIT and Pit Radio are live`

- **GL Archive**: Browse Thai GL series by premiere year, starting in 2022. Explore film strips with airing dates, stories, casts and platforms.
- **Airing calendar**: Open it from the black button below the archive heading. Browse a month on desktop or swipe between weeks on mobile, with titles, episode numbers and times listed by date. Expand an entry for its poster and introduction. Only published dates appear; statuses follow the schedule. Chinese uses Beijing time; English and Thai use Thailand time.
- **Voices from the Pit**: Watch the word-frequency tide, read fans’ original quotes, leave a like or reply, or share a quote of your own.
- **REPO**: Follow the evidence index into collections and illustrated essays.
- **Meme Camera**: Press the instant-camera shutter, watch a meme print and develop, then swipe through your photos to download or retake one.
- **Pit Radio**: Choose a CP sticker, drop the needle and listen to their songs. Skip tracks, repeat a song or open the selected pair’s playlist.
- **About this pit**: Meet the people digging it, and the affection that keeps them going.

The pages use black-and-white editorial layouts with pink highlights. On phones, five paper tabs lead to the main sections; quotes and playlists open in sheets, and photos scroll sideways. Radio stickers show track counts, with room to tap the playback controls. Desktop keeps playful touches such as dragging quote cards or dropping a sticker onto the record.

The music can keep playing as you move between sections. Different pit, same flutter.

### Three languages, one shared collection

The interface, section introductions, series descriptions and REPO essays are available in Chinese, English and Thai. Existing community quotes, comments and chart words also have saved English and Thai translations for display, without overwriting source data. There is no ongoing automatic translation: new or edited posts without a matching translation keep their original wording. Song titles, author names, quotations within REPO essays and text inside original media remain unchanged. Site-made instructions, such as the radio’s “How to play”, use a text-free background with a translated text layer.

Phones use the compact **中 / EN / TH** switcher; desktop uses full language names in a dropdown that closes when focus leaves. Switching keeps the current page, playback state and unfinished form input.

Translations live in `src/i18n/`; visitors do not need a translation service. Article text loads on demand. Long-form translations are machine-assisted drafts and still need ongoing review. Proper names follow producers’ or distributors’ published spellings where verified; sources are recorded in `src/i18n/proper-names.js`. Unverified names retain their source spelling rather than an invented Thai translation.

This isn’t a grand website with everything figured out. We just keep writing reviews, collecting quotes and taking meme photos. Somehow the pit gets a little deeper each day.

Have an idea—or simply feel that something is off? Open an [Issue](../../issues), join [Discussions](../../discussions), or send a Pull Request.

### Dig locally

Requires Node.js 22 or later.

```bash
npm ci
npm run dev
```

Production build and checks:

```bash
npm run build
npm run test:sites
node --test tests/*.test.mjs
```

Interactive features call the same-origin `/api`, which connects to a server-side Node service and a dedicated MySQL database; the browser no longer contains database credentials. Database migrations live in `db/migrations/`, with service setup and runtime details in `server/README.md`. The primary site is published at the VPS root, `https://glfans.com/`; see the [VPS deployment guide](docs/VPS_DEPLOYMENT.md) for Nginx, SSL and atomic releases. The GitHub Pages workflow remains only as a rollback build and explicitly sets `VITE_BASE_PATH=/glfans/`. A normal `npm run build` targets the domain root.

Recent calendar data lives in `src/data/archive-schedule.json`; history is separate in `src/data/archive-history.json` and survives weekly updates. Click the month heading to choose a year/month. Empty months are disabled; available months show distinct show counts for the active filter and open at the first listing. Search the show chooser by title, cast or year; Done switches to Following. History uses sourced episode dates, or only a verified premiere where episode dates are unavailable. Run `npm run sync:history` to refresh reviewed show/season/anthology mappings in `scripts/lib/archive-history-*`; new mappings require review. Run `npm run sync:schedule` to fetch public schedules, `npm run test:schedule` to validate the rules, and `npm run stats:schedule` for local date and status statistics. Failed fetches retain existing data; conflicting dates stay hidden for review. Unknown dates are never generated from episode totals. Sources are [GL Spotlight](https://glspotlight.com/airing) and [TVmaze](https://www.tvmaze.com/api); see [NOTICE](NOTICE) for attribution and licensing. Data changes require a new build and deployment; periodic checks alone do not publish them.

### Ground rules down here

- Enjoy the ship. Don’t spread rumours.
- Read the chemistry your own way. Don’t declare real people’s relationships for them.
- Dig into public archives, not private lives.
- Jokes are welcome; credit public information and source media whenever possible.
- If the ship sinks, take a breath. If it doesn’t, maybe don’t mortgage your whole future to it just yet.

### Content and rights

glfans is an unofficial, non-commercial fan collaboration. Rights to third-party materials remain with their respective owners; the site’s original copyright covers only its own writing, design and code. See [Content rights and media management](docs/RIGHTS_POLICY.md) for boundaries, feedback procedures and the media inventory, and [LICENSE](LICENSE) and [NOTICE](NOTICE) for the repository’s licensing scope. Please read [CONTRIBUTING](CONTRIBUTING.md) before contributing. The rights policy and contribution guide are currently in Chinese; LICENSE and NOTICE are in English.

---

<a id="th"></a>

## ไทย

> ยินดีต้อนรับเข้าด้อม เก็บสติไว้ให้ดีนะ ถึงส่วนใหญ่จะไม่ได้ใช้ก็ตาม

[เข้าด้อมกัน](https://glfans.com/?lang=th#/) · [คลังซีรีส์ GL](https://glfans.com/?lang=th#/archive) · [เสียงจากด้อม](https://glfans.com/?lang=th#/tide-words) · [บทความ REPO](https://glfans.com/?lang=th#/column) · [กล้องสุ่มมีม](https://glfans.com/?lang=th#/memes) · [วิทยุประจำด้อม](https://glfans.com/?lang=th#/radio) · [เกี่ยวกับ](https://glfans.com/?lang=th#/about)

[มาคุยกัน](https://github.com/fanmihua/glfans/discussions) · [แจ้งปัญหา](https://github.com/fanmihua/glfans/issues)

glfans คือเว็บเล็ก ๆ ของแฟนซีรีส์ GL ไทย ที่เราค่อย ๆ ขุดให้ลึกขึ้นทีละนิด

จุดเริ่มต้นง่ายมาก แค่จะลองดูซีรีส์สักเรื่อง

แล้วก็กลายเป็นตามดูเบื้องหลัง ย้อนดูสัมภาษณ์ วิเคราะห์สายตาทีละเฟรม ประกาศว่าจะออกจากด้อม ก่อนที่คลิปถัดไปจะทำให้เราสรุปอย่างจริงจังอีกครั้งว่า—

> **ครั้งนี้ไม่เหมือนเดิมจริง ๆ**

เลยมีหลุมนี้ขึ้นมา

สุดท้ายที่นี่จะกลายเป็นอะไร? ยังคิดไม่ออกหรอก ขุดต่อไปก่อนแล้วกัน

### ตอนนี้ขุดไปถึงไหนแล้ว

`PIT STATUS: หน้าเปิดตัว คลังซีรีส์ เสียงจากด้อม REPO MEME PIT และวิทยุประจำด้อม พร้อมให้สำรวจแล้ว`

- **คลังซีรีส์ GL**: ย้อนดูซีรีส์ GL ไทยตามปีที่เริ่มออกอากาศ ตั้งแต่ปี 2022 ผ่านแถบฟิล์ม พร้อมวันออกอากาศ เรื่องย่อ นักแสดง และช่องทางรับชม
- **ปฏิทินออกอากาศ**: เปิดจากปุ่มสีดำใต้หัวข้อคลังซีรีส์ เดสก์ท็อปแสดงรายเดือน ส่วนมือถือปัดซ้ายขวาเพื่อเปลี่ยนสัปดาห์ แต่ละวันแสดงชื่อซีรีส์ ตอน และเวลา แตะเพื่อดูภาพและเรื่องย่อ แสดงเฉพาะวันที่ประกาศแล้วและปรับสถานะตามกำหนด ภาษาจีนใช้เวลาปักกิ่ง ภาษาอังกฤษและไทยใช้เวลาไทย
- **เสียงจากด้อม**: ดูคลื่นความถี่ของคำ อ่านข้อความต้นฉบับจากชาวด้อม กดถูกใจ ตอบกลับ หรือฝากข้อความของตัวเอง
- **บทความ REPO**: เปิดคลังหลักฐาน เลือกรวมบทความ แล้วอ่านรีวิวและเรื่องเล่าพร้อมภาพทีละเรื่อง
- **กล้องสุ่มมีม**: กดชัตเตอร์กล้องอินสแตนต์ รอมีมพิมพ์ออกมาและภาพค่อย ๆ ชัด จากนั้นเลื่อนดูรูปเพื่อดาวน์โหลดหรือถ่ายใหม่
- **วิทยุประจำด้อม**: เลือกสติกเกอร์คู่จิ้น วางเข็ม แล้วฟังเพลงของพวกเธอ เปลี่ยนเพลง เล่นซ้ำเพลงเดียว หรือเปิดเพลย์ลิสต์ของคู่ที่เลือกได้
- **เกี่ยวกับด้อมนี้**: มารู้จักคนขุดหลุม และความรักที่ทำให้ยังขุดต่อ

หน้าเว็บใช้เลย์เอาต์แบบนิตยสาร โทนขาวดำและสีชมพูเป็นจุดเน้น บนมือถือมีป้ายกระดาษห้าป้ายด้านล่างสำหรับเปลี่ยนหมวด ข้อความและเพลย์ลิสต์เปิดเป็นแผง ส่วนรูปถ่ายเลื่อนดูแนวนอนได้ สติกเกอร์วิทยุแสดงจำนวนเพลง และปุ่มควบคุมมีพื้นที่ให้แตะสะดวก บนเดสก์ท็อปยังมีลูกเล่นอย่างลากการ์ดข้อความ หรือลากสติกเกอร์ไปวางบนแผ่นเสียง

เปลี่ยนหมวดแล้วเพลงก็ยังเล่นต่อได้ เปลี่ยนด้อมได้ แต่ใจยังเต้นต่อไป

### สามภาษา เนื้อหาชุดเดียวกัน

ส่วนติดต่อผู้ใช้ คำแนะนำแต่ละหมวด เรื่องย่อซีรีส์ และเนื้อหาบทความ REPO มีภาษาจีน อังกฤษ และไทย ข้อความ ความคิดเห็น และคำในกราฟที่มีอยู่ในหมวดเสียงจากด้อมมีคำแปลอังกฤษและไทยที่บันทึกไว้สำหรับแสดงผล โดยไม่เขียนทับข้อมูลต้นฉบับ ไม่มีบริการแปลอัตโนมัติต่อเนื่อง ข้อความใหม่หรือข้อความที่แก้ไขแล้วแต่ยังไม่มีคำแปลจะใช้ภาษาต้นทาง ชื่อเพลง ชื่อผู้เขียน ข้อความอ้างอิงในบทความ REPO และข้อความในสื่อต้นฉบับยังคงเดิม ส่วนคำแนะนำที่เว็บทำเอง เช่น “วิธีเล่น” ของวิทยุ ใช้พื้นหลังที่ไม่มีตัวหนังสือ แล้วซ้อนข้อความตามภาษาที่เลือก

มือถือใช้ปุ่มย่อ **中 / EN / TH** ส่วนเดสก์ท็อปใช้เมนูชื่อภาษาเต็ม ซึ่งจะปิดเมื่อโฟกัสออกจากเมนู การเปลี่ยนภาษาไม่พาออกจากหน้าปัจจุบัน ไม่เริ่มสถานะการเล่นเพลงใหม่ และไม่ล้างข้อความที่กำลังกรอก

คำแปลเก็บไว้ใน `src/i18n/` ผู้เยี่ยมชมไม่ต้องเชื่อมต่อบริการแปลภาษา เนื้อหาบทความโหลดเมื่อเปิดอ่าน คำแปลบทความยาวเป็นฉบับที่ใช้เครื่องมือช่วยแปลและยังต้องตรวจทานต่อเนื่อง ชื่อเฉพาะใช้การสะกดที่ผู้ผลิตหรือผู้จัดจำหน่ายเผยแพร่เมื่อยืนยันได้ โดยบันทึกแหล่งอ้างอิงใน `src/i18n/proper-names.js` ชื่อที่ยังไม่ได้ยืนยันจะคงการสะกดจากต้นทาง ไม่แต่งชื่อภาษาไทยขึ้นเอง

ที่นี่ยังไม่ใช่เว็บใหญ่ที่วางแผนไว้ครบทุกอย่าง แค่เขียนรีวิวไป เก็บข้อความไป ถ่ายมีมไป เผลออีกทีหลุมก็ลึกกว่าเมื่อวานนิดหนึ่งแล้ว

ถ้ามีไอเดีย หรือแค่รู้สึกว่า “ตรงนี้ไม่ใช่” เปิด [Issue](../../issues) มาคุยใน [Discussions](../../discussions) หรือส่ง Pull Request ได้เลย

### ขุดบนเครื่องของตัวเอง

ใช้ Node.js เวอร์ชัน 22 ขึ้นไป

```bash
npm ci
npm run dev
```

สร้างเวอร์ชันสำหรับเผยแพร่และตรวจสอบ:

```bash
npm run build
npm run test:sites
node --test tests/*.test.mjs
```

ฟีเจอร์โต้ตอบเชื่อมต่อกับ `/api` บนโดเมนเดียวกัน ซึ่งส่งต่อไปยังบริการ Node ฝั่งเซิร์ฟเวอร์และฐานข้อมูล MySQL แยกเฉพาะ โดยเบราว์เซอร์ไม่เก็บคีย์ฐานข้อมูลอีกต่อไป ไฟล์ย้ายโครงสร้างฐานข้อมูลอยู่ใน `db/migrations/` และรายละเอียดการตั้งค่ากับการรันบริการอยู่ใน `server/README.md` เว็บไซต์หลักเผยแพร่จาก VPS ที่รากโดเมน `https://glfans.com/` ดูขั้นตอน Nginx, SSL และการสลับรุ่นแบบอะตอมมิกได้ใน [คู่มือเผยแพร่ VPS](docs/VPS_DEPLOYMENT.md) ส่วน workflow ของ GitHub Pages เก็บไว้เป็นทางย้อนกลับเท่านั้น และกำหนด `VITE_BASE_PATH=/glfans/` อย่างชัดเจน ขณะที่ `npm run build` ปกติจะสร้างเวอร์ชันสำหรับรากโดเมน

ข้อมูลล่าสุดอยู่ใน `src/data/archive-schedule.json` ส่วนข้อมูลย้อนหลังแยกไว้ใน `src/data/archive-history.json` และไม่ถูกเขียนทับเมื่ออัปเดตรายสัปดาห์ แตะชื่อเดือนเพื่อเลือกปีและเดือน เดือนที่ไม่มีรายการจะเลือกไม่ได้ เดือนที่มีรายการแสดงจำนวนซีรีส์ที่ไม่ซ้ำตามตัวกรอง และเปิดไปยังรายการแรกของเดือน ค้นหาซีรีส์ด้วยชื่อ นักแสดง หรือปี แล้วกดเสร็จเพื่อดูเฉพาะเรื่องที่ติดตาม ข้อมูลย้อนหลังใช้วันที่รายตอนจากแหล่งข้อมูล หากไม่มีจะลงเฉพาะวันฉายตอนแรกที่ยืนยันแล้ว ใช้ `npm run sync:history` เพื่ออัปเดตข้อมูลจากรายการซีรีส์ ซีซัน และตอนย่อยที่ตรวจสอบแล้วใน `scripts/lib/archive-history-*` รายการใหม่ต้องตรวจสอบก่อน ใช้ `npm run sync:schedule` เพื่อดึงกำหนดการสาธารณะ, `npm run test:schedule` เพื่อตรวจสอบกฎ และ `npm run stats:schedule` เพื่อสร้างสถิติวันที่และสถานะบนเครื่อง หากดึงข้อมูลไม่สำเร็จจะเก็บข้อมูลเดิมไว้ วันที่ที่ขัดแย้งกันจะซ่อนระหว่างรอตรวจสอบ และไม่คำนวณวันที่ที่ยังไม่ทราบจากจำนวนตอน แหล่งข้อมูลคือ [GL Spotlight](https://glspotlight.com/airing) และ [TVmaze](https://www.tvmaze.com/api) ดูที่มาและใบอนุญาตใน [NOTICE](NOTICE) การแก้ข้อมูลต้องสร้างและเผยแพร่เว็บใหม่ การตรวจสอบเป็นระยะไม่ได้เผยแพร่ข้อมูลขึ้นเว็บโดยอัตโนมัติ

### กติกาชาวด้อม

- จิ้นได้ แต่อย่าปล่อยข่าวลือ
- เชื่อในเคมีได้ แต่อย่าตัดสินสถานะความสัมพันธ์แทนคนจริง
- ย้อนดูข้อมูลสาธารณะได้ แต่อย่าขุดชีวิตส่วนตัว
- เล่นมุกได้ แต่ข้อมูลและสื่อควรระบุแหล่งที่มาเท่าที่ทำได้
- ถ้าเรือล่ม หายใจลึก ๆ ก่อน ถ้ายังไม่ล่ม ก็อย่าเพิ่งเดิมพันทั้งชีวิตกับมันนะ

### เนื้อหาและสิทธิ์

glfans เป็นเว็บที่แฟนคลับร่วมกันสร้างอย่างไม่เป็นทางการและไม่แสวงหากำไร สิทธิ์ในสื่อของบุคคลที่สามเป็นของเจ้าของสิทธิ์แต่ละราย ลิขสิทธิ์ต้นฉบับของเว็บครอบคลุมเฉพาะงานเขียน งานออกแบบ และโค้ดที่เว็บสร้างเอง ดูขอบเขต ขั้นตอนแจ้งข้อกังวล และทะเบียนสื่อได้ที่ [สิทธิ์ในเนื้อหาและการจัดการสื่อ](docs/RIGHTS_POLICY.md) ส่วนขอบเขตการอนุญาตของคลังโค้ดอยู่ใน [LICENSE](LICENSE) และ [NOTICE](NOTICE) กรุณาอ่าน [CONTRIBUTING](CONTRIBUTING.md) ก่อนร่วมสร้างเนื้อหา นโยบายสิทธิ์และคู่มือการมีส่วนร่วมปัจจุบันเป็นภาษาจีน ส่วน LICENSE และ NOTICE เป็นภาษาอังกฤษ
