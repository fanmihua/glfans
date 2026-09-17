import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { registerCatalog, translate, LOCALES, readPreferredLocale, reactionLabel } from '../src/i18n/runtime.js';
import { editorial } from '../src/i18n/editorial.js';
import { verifiedSeries, seriesName, localizeCast } from '../src/i18n/proper-names.js';
import { communityCopy, communityText } from '../src/i18n/community-copy.js';
import { collectedQuotes } from '../src/data/tide-words.js';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const catalogs = Object.fromEntries(['en', 'th'].map(locale => [locale, Object.fromEntries(['ui', 'article', 'archive'].map(kind => [kind, JSON.parse(read(`../src/i18n/${locale}-${kind}.json`))]))]));
for (const locale of ['en', 'th']) for (const dictionary of Object.values(catalogs[locale])) registerCatalog(locale, dictionary);

test('Chinese remains the source, including whitespace and original data', () => {
  assert.deepEqual(LOCALES, ['zh', 'en', 'th']);
  assert.equal(readPreferredLocale(), 'zh');
  assert.equal(translate('  这次真的不一样。\n', 'zh'), '  这次真的不一样。\n');
  const element = { type: 'p', props: { children: '中文原话' } };
  assert.equal(translate(element, 'en'), element);
  assert.equal(translate(0, 'th'), 0);
  assert.equal(translate(null, 'th'), null);
});

test('UI copy and template values translate without altering quoted user text', () => {
  assert.equal(translate('文学', 'en'), 'Quotes');
  assert.equal(translate('文学', 'th'), 'คำคม');
  assert.equal(translate('4 部剧集', 'en'), '4 series');
  assert.equal(translate('4 部剧集', 'th'), '4 เรื่อง');
  assert.equal(translate('评论：这次真的不一样。', 'en'), 'Reply to: 这次真的不一样。');
  assert.equal(translate('未知的网友留言 ABC', 'en'), '未知的网友留言 ABC');
  assert.equal(translate('范米花儿', 'th'), '范米花儿');
  assert.equal(translate('  正在捞回声  ', 'en'), '  Loading replies…  ');
  for (const message of [
    '邮箱或密码不对，或者账号还没有启用。',
    '登录尝试过多，请十五分钟后再试。',
    '登录服务暂时没有回应，请稍后再试。',
    '退出失败，请重试。',
  ]) {
    assert.doesNotMatch(translate(message, 'en'), /\p{Script=Han}/u);
    assert.doesNotMatch(translate(message, 'th'), /\p{Script=Han}/u);
  }
});

test('Both languages have matching complete, nonempty catalog entries and placeholders', () => {
  for (const kind of ['ui', 'archive', 'article']) {
    assert.deepEqual(Object.keys(catalogs.en[kind]).sort(), Object.keys(catalogs.th[kind]).sort());
    for (const locale of ['en', 'th']) {
      for (const [source, value] of Object.entries(catalogs[locale][kind])) {
        assert.equal(typeof value, 'string');
        assert.ok(value.trim(), `${locale}/${kind}: empty ${source}`);
        assert.ok(!/GLFANS_\d{4}/.test(value), 'Batch marker must never reach UI');
        const slots = text => [...text.matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort();
        assert.deepEqual(slots(value), slots(source), `${locale}: lost placeholders in ${source}`);
      }
    }
  }
});

test('Public article prose is covered without changing original XML or media', () => {
  const data = JSON.parse(read('../src/data/column-data.json'));
  const missing = [];
  for (const collection of data.collections) {
    for (const article of collection.articles.filter(a => !a.hidden)) {
      for (const match of article.xml.matchAll(/>([^<>]+)</g)) {
        const source = match[1].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replace(/\s+/g, ' ').trim();
        if (!/\p{Script=Han}/u.test(source)) continue;
        for (const locale of ['en', 'th']) {
          const found = editorial[locale][source] || Object.values(catalogs[locale]).some(catalog => catalog[source]);
          if (!found) missing.push(`${locale}/${collection.slug}/${article.slug}: ${source.slice(0,60)}`);
        }
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('Community uses display translations while music and article quotations keep originals', () => {
  assert.match(read('../src/WordsTideLab.jsx'), /const displayText = communityText\(item.text\)/);
  assert.match(read('../src/TideCommunity.jsx'), /<p>\{communityText\(comment.body\)\}<\/p>/);
  assert.match(read('../src/features/community/MobileTideSheet.jsx'), /<blockquote>\{communityText\(quote.text\)\}/);
  assert.match(read('../src/PitRadioPage.jsx'), /selectedTrack \? selectedTrack\.trackTitle : t\(/);
  assert.match(read('../src/features/column/ArticleDocument.jsx'), /closest\('blockquote, quote'\)/);
});

test('Language catalogs stay lazy and language changes do not reload or reset the route', () => {
  const runtime = read('../src/i18n/runtime.js');
  assert.match(runtime, /import\('\.\/en-ui\.json'\)/);
  assert.match(runtime, /import\('\.\/en-article\.json'\)/);
  assert.match(runtime, /import\('\.\/th-article\.json'\)/);
  assert.match(runtime, /import\('\.\/th-archive\.json'\)/);
  assert.doesNotMatch(runtime, /location\.(?:reload|assign)|location\.hash\s*=/);
  assert.match(runtime, /replaceState\(window\.history\.state/);
  assert.match(read('../src/features/column/ArticlePage.jsx'), /requireCatalog\('article'\)/);
});

test('Official names override literal translations, unknown names keep source spelling', () => {
  for (const entry of verifiedSeries) for (const alias of entry.aliases) {
    assert.equal(translate(alias, 'en'), entry.en);
    assert.equal(translate(alias, 'th'), entry.th);
    assert.match(entry.source, /^https:\/\//);
  }
  assert.equal(translate('设计爱情', 'en'), 'Love Design');
  assert.equal(seriesName({title:'未知剧名',titleEn:'Original Title'}, 'th'), 'Original Title');
  assert.equal(localizeCast('余晶晶（Jingjing）', 'en'), 'Jingjing Yu（Jingjing）');
});

test('Responsive language controls use short mobile cards and a keyboard-operable desktop menu', () => {
  const switcher = read('../src/i18n/LanguageSwitcher.jsx');
  assert.match(switcher, /zh: '中', en: 'EN', th: 'TH'/);
  assert.match(switcher, /role="menuitemradio"/);
  assert.match(switcher, /aria-pressed=\{locale === code\}/);
  assert.match(switcher, /ArrowDown/);
  assert.match(switcher, /Escape/);
  assert.doesNotMatch(switcher, /<select/);
  const css = read('../src/i18n/localized-layout.css');
  assert.match(css, /left: 50%; top: 50%; transform: translate\(-50%, -50%\)/);
  assert.match(css, /\.language-dropdown \{ display: none;/);
});

test('Dynamic accessibility labels translate UI metadata but preserve original quotes', () => {
  for (const locale of ['en', 'th']) {
    for (const count of [null, 0, 12]) for (const liked of [false, true]) {
      assert.doesNotMatch(reactionLabel(liked, count, locale), /\p{Script=Han}/u);
    }
    const name = translate('宿敌恋人', locale);
    for (const template of ['{0}合集封面', '{0}文章列表', '{0}合集结束', '返回{0}合集', '{0}剧集封面']) {
      assert.doesNotMatch(translate(template, locale, [name]), /\p{Script=Han}|\{\d+\}/u);
    }
  }
  assert.equal(reactionLabel(false, 0, 'zh'), '送出心动，当前 0 次');
  assert.equal(reactionLabel(true, null, 'zh'), '取消心动，统计加载中');
});

test('Radio instruction artwork has a separate localized heading and text-free texture', () => {
  const component = read('../src/features/radio/RadioHowTo.jsx');
  assert.match(component, /how-to-paper-blank\.webp/);
  assert.match(component, /<h2 className="pit-radio-howto-title">\{t\("怎么玩"\)\}<\/h2>/);
  assert.match(read('../src/WordsTideLab.jsx'), /<span>\{communityText\(word.name\)\}<\/span>/);
});

test('All existing community copy is translated; new or edited posts retain their originals', () => {
  const existing = [
    ...collectedQuotes.map(quote => quote.text),
    '这里可以投稿，也可以在别人的卡片下接着聊。', '剧可以完结，我的脑补不行',
    '测试', '当当都一样', '献上七字箴言',
    '我懂', '救命', '真的', '感动', '支持', '想你', '朋友', 'CP', '喜欢',
  ];
  assert.deepEqual(Object.keys(communityCopy.en).sort(), Object.keys(communityCopy.th).sort());
  for (const text of existing) {
    assert.equal(communityText(text, 'zh'), text);
    for (const locale of ['en', 'th']) {
      assert.ok(communityCopy[locale][text]);
      assert.doesNotMatch(communityText(text, locale), /\p{Script=Han}/u);
    }
  }
  for (const locale of ['zh', 'en', 'th']) {
    assert.equal(communityText('刚刚新发布的内容', locale), '刚刚新发布的内容');
    assert.equal(communityText('这次真的不一样。后来补了一句', locale), '这次真的不一样。后来补了一句');
    assert.equal(communityText('范米花儿 × Conceal', locale), '范米花儿 × Conceal');
  }
});

test('Collection card title fragments and remaining cast names are localized', () => {
  for (const locale of ['en', 'th']) {
    for (const label of ['爱是向你伸出的手', 'Wine 视角', '主观 Repo 07', '（吐槽向）']) {
      assert.doesNotMatch(translate(label, locale), /\p{Script=Han}/u);
    }
    assert.doesNotMatch(localizeCast('维罗妮卡·帕加诺（饰 Sita）', locale), /\p{Script=Han}/u);
  }
  assert.match(read('../src/features/column/ArticleDocument.jsx'), /alt=\{t\(imageDescription\)\}/);
});

test('Localized heading wrappers reset Chinese collage tracking and allow long card titles to wrap', () => {
  const css = read('../src/i18n/localized-layout.css');
  assert.match(css, /html:not\(:lang\(zh\)\) \.app-shell :is\(h1, h2, h3\) :is\(span, i, b, strong, em\)/);
  assert.match(css, /letter-spacing: normal;\s*word-spacing: normal;/);
  assert.match(css, /\.home-title-row-two \{[^}]*margin-top: \.14em/);
  assert.match(css, /html:lang\(th\) \.app-shell :is\(h1, h2, h3\)[\s\S]*?line-height: 1\.4/);
  assert.match(css, /\.article-card-title :is\(strong, small\) \{\s*white-space: normal;/);
});

test('Community reply labels translate their action as well as the fixed display quote', () => {
  for (const locale of ['en', 'th']) {
    const quote = communityText('这次真的不一样。', locale);
    for (const action of ['展开评论：{0}', '收起评论：{0}']) {
      const label = translate(action, locale, [quote]);
      assert.ok(label.includes(quote));
      assert.doesNotMatch(label, /\p{Script=Han}|\{\d+\}/u);
    }
    for (const action of ['展开{0} 条评论', '收起{0} 条评论']) {
      assert.doesNotMatch(translate(action, locale, [2]), /\p{Script=Han}|\{\d+\}/u);
    }
  }
});

test('Compact language controls keep mobile hit areas and article back is icon-only', () => {
  const css = read('../src/i18n/localized-layout.css');
  assert.match(css, /\.language-trigger \{[^}]*min-height: 32px/);
  assert.match(css, /\.language-tabs button \{[^}]*min-height: 44px/);
  assert.match(css, /\.language-tabs::before \{[^}]*inset: 8px 0/);
  assert.match(css, /\.site-header-language \{ margin-inline-start: 24px/);
  const article = read('../src/features/column/ArticleView.jsx');
  const back = article.match(/<a className="article-toolbar-back"[\s\S]*?<\/a>/)[0];
  assert.match(back, /aria-label=/);
  assert.match(back, /<ArrowLeft/);
  assert.doesNotMatch(back, /<span/);
});

test('Desktop language menu dismisses on focus loss and cleans up global listeners', () => {
  const switcher = read('../src/i18n/LanguageSwitcher.jsx');
  assert.match(switcher, /!event.currentTarget.contains\(event.relatedTarget\)/);
  assert.match(switcher, /const loseWindowFocus = \(\) => setOpen\(false\)/);
  assert.match(switcher, /if \(document.hidden\) setOpen\(false\)/);
  for (const [event, handler] of [['blur', 'loseWindowFocus'], ['visibilitychange', 'visibilityChanged']]) {
    assert.ok(switcher.includes(`addEventListener('${event}', ${handler})`));
    assert.ok(switcher.includes(`removeEventListener('${event}', ${handler})`));
  }
});

test('README exposes three complete language sections and matching site links', () => {
  const readme = read('../README.md');
  for (const locale of LOCALES) {
    assert.ok(readme.includes(`<a id="${locale}"></a>`));
    assert.ok(readme.includes(`](#${locale})`));
    assert.equal(readme.split(`https://glfans.com/?lang=${locale}#`).length - 1, 8);
  }
  assert.equal(readme.split('npm ci').length - 1, 3);
  assert.equal(readme.split('npm run test:sites').length - 1, 3);
});
