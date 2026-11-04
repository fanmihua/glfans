# GMMTV NEXT 本地更新 · 2026-11-04

用户已确认本轮 9 张官方海报和 6 张双人形象照片。资料来自 2026-11-03 官方发布；不把官宣日或推介会年度当首播日期。沿用现有百家饭待定作品区、双人档案和纸相框。新增双人照沿用 imagegen 粉色手写名字素材；真实照片、纸框和名字保持独立分层。

- 9 个稳定项目 ID，12 处 CP 作品关联；Be Mine 四篇章共享项目及主海报。
- 6 个新收录 CP；Mewnich 复用已有演员资料，JuneMewnich 历史作品保留。
- 海报完整显示；原图保存在本地审核素材目录，网站只使用压缩 WebP。
- 未核实中文译名保持官方英文标题，泰语使用官方泰文标题。
- 无已确认首播日期，不新建年度档案条目或日历排期。
- 用户已验收选图及手写名签，并于 2026-11-04 授权推送主线与部署；发布核验记录保存在本地 `output/release-gmmtv-20261104/`。

## 海报与双人照片出处

- P01 · https://x.com/GMMTV/status/2117593885014986925 · 原图 https://pbs.twimg.com/media/HWMzG3pbYAA81qu.jpg?name=orig
- P02 · https://x.com/GMMTV/status/2117580109616136530 · 原图 https://pbs.twimg.com/media/HWMnkdBaIAES3Qq.jpg?name=orig
- P03 · https://x.com/GMMTV/status/2117558164141060209 · 原图 https://pbs.twimg.com/media/HWMTlawawAAO8SZ.jpg?name=orig
- P04 · https://x.com/GMMTV/status/2117588668521312631 · 原图 https://pbs.twimg.com/media/HWMucb5aUAAKNwL.jpg?name=orig
- P05 · https://x.com/GMMTV/status/2117573219259744760 · 原图 https://pbs.twimg.com/media/HWMgcJzbEAAxNfu.jpg?name=orig
- P06 · https://x.com/GMMTV/status/2117562604315111773 · 原图 https://pbs.twimg.com/media/HWMWkbSaYAAaVSa.jpg?name=orig
- P07 · https://x.com/GMMTV/status/2117567602805633118 · 原图 https://pbs.twimg.com/media/HWMbi7SakAElSfX.jpg?name=orig
- P08 · https://x.com/GMMTV/status/2117599852255481916 · 原图 https://pbs.twimg.com/media/HWM35LhaMAAc7Jn.jpg?name=orig
- P09 · https://x.com/GMMTV/status/2117605041528025557 · 原图 https://pbs.twimg.com/media/HWM9TSmaUAAT8Q_.jpg?name=orig
- C01 · https://x.com/SafetyflirtTH/status/2117605719260504511 · 原图 https://pbs.twimg.com/media/HWM_LEvbUAAIMPC.jpg?name=orig
- C02 · https://x.com/BMLStoriesGMMTV/status/2117600248713634150 · 原图 https://pbs.twimg.com/media/HWM6MO5aAAA6x2D.jpg?name=orig
- C03 · https://x.com/BMLStoriesGMMTV/status/2117600333165981874 · 原图 https://pbs.twimg.com/media/HWM6RZka8AAdnUj.jpg?name=orig
- C04 · https://x.com/KissMe_Stranger/status/2117573999903531338 · 原图 https://pbs.twimg.com/media/HWMiUuSa4AEAMBj.jpg?name=orig
- C05 · https://x.com/AboveHerClass/status/2117563344844710250 · 原图 https://pbs.twimg.com/media/HWMYolLa4AAea3L.jpg?name=orig
- C06 · https://x.com/LovesEchoes_/status/2117568178360565779 · 原图 https://pbs.twimg.com/media/HWMdCEDbYAAXcZL.jpg?name=orig

## 手写名字素材

按用户纠正，使用内置 image_gen 逐一生成 6 张透明粉色手写名字，参考既有 MilkLove 名签，包含细下划线与小空心爱心。拼写逐张核对，保留真实照片独立分层。原始 PNG 和完整提示词：`output/imagegen/gmmtv-next/`；网站压缩版本：`public/assets/cp/gmmtv-next/*-signature-v1.webp`。元数据见 `gmmtv-next-signatures.json`。

## 本地验收

- 生产构建、媒体预算检查通过，新增 15 张官图约 3 MB；6 张手写名签均为保留透明通道的 WebP。
- CP 测试 48 项、日历测试 21 项、Sites 打包检查 4 项、既有 October / Shades 回归 8 项通过。
- 6 个新 CP 页面均验证人物照片与手写名签加载成功，无横向溢出。
- 320、390、768、1024、1440 尺寸检查；修复两个长 CP 名称在窄屏的换行。
- 验证 Be My Boo 搜索仅匹配 Sangt–Acare；Be Mine 作品内可跳转四组关联 CP；泰语作品和时间线共用标题 ID。
- 本地预览： http://127.0.0.1:4197/#/cp/jaoyingmewnich 。页面截图在 `output/gmmtv-next-qa/jaoyingmewnich-generated-signature.png`。
