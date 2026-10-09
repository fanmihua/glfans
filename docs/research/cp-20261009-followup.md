# 百家饭纠错与页头主图 · 2026-10-09

本地实现与验收完成；用户随后明确授权发布。发布提交与线上验收结果记录在同一飞书建议文档。

## 资料纠错

- ShellyPundao / PlaifahMiusic 名称独立维护；旧 aomshelly / musicplaifah 路由与旧名搜索保留。Pundao / Miusic 的人物与账号对应关系保持；Plaifah 演员名统一为 Plaifah Siraacha，与 Runaway 演员表一致（https://www.imdb.com/title/tt37342224/fullcredits/）。
- Motion Minds Entertainment 2026-10-01 公告明确终止 Shelly 与 Pundao 共同工作安排，既定工作逐项审核。仅记录职业合作，不推断私人关系。保留泰、英各两页原公告。来源：https://x.com/MotionMindsEntt/status/2105628905092915400 。
- Pluto 补充 Kapook=Pim、Ciize=Pang、Earn=Jan 三人角色感情线；KapookCiize 仍为双人档案。官方角色表：https://www.gmm-tv.com/contents/VgvYE/ 。未找到合适三人配图时保持文字条目。
- 副 CP 的作品卡使用对应演员合照并明确标注，停止自动套用主 CP 预告作为该副 CP 的精选影像。卡冰新增官方双人 MV：https://www.gmm-tv.com/contents/VLbpx/ 。

## 页头拼贴主图

新增 10 组，保留现有 7 组。共有 17/65 组带主图，另外 48 组本轮尚未补齐。合照来源为 GLThai 资料站 https://glthai.com/couple/ ，不标作公司官方图。高清程度按取得的原始尺寸记录，不用 AI 放大人脸或补造细节。

| CP | 原始尺寸 | 图片来源 |
|---|---|---|
| KapookCiize | 808×808 | [原照片](https://glthai.com/wp-content/uploads/cp-KapookCiize.jpg) |
| PlaifahMiusic | 1200×800 | [原照片](https://glthai.com/wp-content/uploads/cp-PlaifahMiusic.webp) |
| LMSY | 823×823 | [原照片](https://glthai.com/wp-content/uploads/cp-lmsy-2.jpg) |
| MilkLove | 570×575 | [原照片](https://glthai.com/wp-content/uploads/cp-milklove-2.jpg) |
| ViewMim | 902×902 | [原照片](https://glthai.com/wp-content/uploads/cp-viewmim.jpg) |
| FayGene | 1200×760 | [原照片](https://glthai.com/wp-content/uploads/cp-FayGene-1200-760.webp) |
| GiftAomsin | 1200×760 | [原照片](https://glthai.com/wp-content/uploads/cp-GiftAomsin-1200-760.webp) |
| LinnPraew | 800×800 | [原照片](https://glthai.com/wp-content/uploads/cp-LinnPraew.jpg) |
| FriendPalm | 1170×782 | [原照片](https://glthai.com/wp-content/uploads/cp-FriendPalm.webp) |
| ShellyPundao | 1200×800 | [原照片](https://glthai.com/wp-content/uploads/cp-ShellyPundao.webp) |

### 人脸与名称保真

照片仅做 WebP 编码，不进入生成模型；网页直接加载真实照片。CP 名称使用 cpLabel 的核实文字，独立于图片。AI 仅生成无人物、无文字的空白撕纸框。最初含人物的试生成未采用。装饰框全站复用，10 张照片与框共 1,166,118 字节（约 1.11 MiB），响应式派生版本另计。按当前 CP 页面加载。原始下载位于本地 output/cp-photo-review/，未加入 public。

### 空白框生成记录

内置 image_gen，透明背景，参考已有 namtanfilm-card-v1.webp。提示：Generate an EMPTY scrapbook photo frame decoration for a website, matching the reference's realistic torn thick white paper texture, magenta pink masking tape, silver paperclip, small pink handdrawn heart and lower black torn-paper name label. NO PEOPLE, NO PHOTOGRAPH, NO FACES, NO TEXT, NO LETTERS. Square transparent frame overlay; central large photo aperture entirely transparent; outer paper edges transparent; no rectangular backdrop.

装饰文件：public/assets/cp/portraits/scrapbook-frame-v1.webp。人物文件与来源映射：src/features/cp/cp-portrait-updates.js。

## 验证

- 构建与资源预算通过；原有大 chunk 提示仍存在。
- 全套 253 项测试通过。
- 桌面逐组检查 10 张主图：原始人脸、CP 名称、图片路由对应正确，无横向溢出。
- 手机检查卡冰与 ShellyPundao，合作公告保留四页并可展开。
- 预览 http://127.0.0.1:5187/#/cp/kapookciize 。
