# 日历订阅公开数据（2026-10-16）

`scripts/build-calendar-subscription.mjs` 与网页共用 `mergeCalendarData(history, current)`，读取历史与本期排期，不按浏览月份截取，不推算来源未公布的后续集数。`needsReview` 条目不进入订阅。节目目录保留合并后全部已知剧集，包括目前没有已确认日期的剧，便于提前订阅后续更新。

`npm run build` 在所有静态资源、分享页、App 数据和 Sites 准备步骤完成后生成 `dist/client/calendar/subscription.json`。也可以用 `npm run build:calendar` 单独更新该文件。该文件由 `/api/calendar.ics` 读取；接口负责三语标题、剧集筛选和 ICS 格式，不直接依赖前端模块。

数据格式：

```js
{
  version: 1,
  generatedAt: '来源已有核对时间的最大值，ISO UTC',
  series: [{ id, titles: { zh, en, th }, network, platforms: [] }],
  events: [{
    id, sourceId, seriesId, episode, episodeUnit,
    date: 'YYYY-MM-DD', airsAt: 'ISO UTC 或 null',
    sourceUrl, network, platforms: [], updatedAt: 'ISO UTC'
  }]
}
```

标题使用网站同一 `seriesName` 规则；没有年度档案的剧以已有来源名称回退。剧集和事件按稳定 ID 排序。`generatedAt` 取数据中已有的 `checkedAt` / `sourceCheckedAt`，事件 `updatedAt` 依次取自身 `sourceCheckedAt`、`checkedAt`、整体核对时间，不使用构建机器当前时间。相同输入重复生成的字节相同。

订阅事件 ID 保留 `剧集ID:ep:集数` 和 `剧集ID:part:分段号`，日期与语言不参与身份。已确认首次播出的 `:premiere` 在订阅中映射为 `:ep:1`；明确分段播出的作品映射为 `:part:1`，后续补充集数或改期仍使用同一 UID。`sourceId` 保存映射前的原始 ID。若来源同时存在 premiere 与明确的第一集 / 第一段，明确集记录优先，仅输出一条。该规则只影响持续订阅，不改变原始排期或一次性导出。

只知日期的记录保留 `airsAt: null`，包括《深宫幽情》EP5；不填假时刻、结束时间或时长。构建发现非法日期、缺少可追溯 HTTPS 来源、没有核对时间或整体没有可发布事件时失败，避免错误空源覆盖已订阅日程。

定向校验：`node --test tests/calendar-subscription-build.test.mjs`，覆盖全部历史与未来、当前更正优先、待核实过滤、节目白名单、三语回退、premiere 升级 / 改期身份、分段去重、来源时间与两次 CLI 生成一致。
