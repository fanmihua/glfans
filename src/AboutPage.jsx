import { t } from "./i18n/runtime.js";
import { getLocale } from './i18n/runtime.js';
import { withBase } from "./lib/assets.js";
import { useState } from "react";
import { PlayCircle } from "@phosphor-icons/react";
import { RepoFilmStrip } from "./RepoFilmStrip.jsx";
import { SiteHeader } from "./SiteHeader.jsx";
import { RightsNotice } from "./RightsNotice.jsx";
import { RIGHTS_FEEDBACK_URL, RIGHTS_SHORT_NOTICE } from "./rights.js";
import { aboutLetter } from "./features/about/about-letter.js";
import "./about-page.css";


function HanddrawnHeart({ className = "" }) {
  return (
    <img
      className={className}
      src={withBase("assets/repo-handdrawn-heart-pink.webp")}
      alt=""
      aria-hidden="true"
      decoding="async"
      data-page-critical="true"
    />
  );
}

function LetterParagraph({ text, highlights = [] }) {
  const parts = [];
  let cursor = 0;
  for (const highlight of highlights) {
    const start = text.indexOf(highlight.text, cursor);
    if (start < 0) continue;
    parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className={`about-letter-emphasis about-letter-emphasis--${highlight.style}`}>
        {highlight.text}
      </mark>
    );
    cursor = start + highlight.text.length;
  }
  parts.push(text.slice(cursor));
  return <p>{parts}</p>;
}

export function AboutPage({ defaultRightsOpen = false }) {
  const [rightsOpen, setRightsOpen] = useState(defaultRightsOpen);
  const letter = aboutLetter[getLocale()] || aboutLetter.zh;

  return (
    <main className="about-shell about-letter-page">
      <SiteHeader activePath="about" />

      <section className="about-stage" aria-labelledby="about-title">
        <span className="about-ghost-word" aria-hidden="true">{t("ABOUT")}</span>

        <div className="about-title-cluster">
          <HanddrawnHeart className="about-heart about-heart-title" />
          <h1 id="about-title" aria-label={t("关于这个坑")}>
            <span className="about-title-top" aria-hidden="true">
              {getLocale() === 'zh' ? <><i>关</i><i>于</i></> : <i>{getLocale() === 'en' ? 'About' : 'เกี่ยวกับ'}</i>}
            </span>
            <span className="about-title-bottom" aria-hidden="true">
              {getLocale() === 'zh' ? ['这', '个', '坑'].map(character => <i key={character}>{character}</i>) : <i>{getLocale() === 'en' ? 'this pit' : 'ด้อมนี้'}</i>}
            </span>
          </h1>
          <img
            className="about-title-underline"
            src={withBase("assets/repo-handdrawn-underline-pink.webp")}
            alt=""
            aria-hidden="true"
            decoding="async"
            data-page-critical="true"
          />
          <a
            className="about-pullquote"
            href="https://163cn.tv/bi2MN1IJ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t("这次真的不一样。")} ${letter.mvLinkLabel}`}
            title={letter.mvLinkLabel}
          >
            <span>{t("这次真的不一样。")}</span>
            <PlayCircle className="about-pullquote-play" weight="fill" aria-hidden="true" />
          </a>
        </div>

        <article className="about-letter" aria-labelledby="about-letter-title">
          <h2 id="about-letter-title">{letter.title}</h2>
          <div className="about-letter-body">
            {letter.paragraphs.map((paragraph, index) => (
              <LetterParagraph key={index} text={paragraph} highlights={letter.highlights[index]} />
            ))}
          </div>
          <p className="about-letter-signature" translate="no">{letter.signature}</p>
        </article>

        <section className="about-makers" aria-labelledby="about-makers-title">
          <header className="about-makers-heading">
            <h2 id="about-makers-title">{t("挖坑的人")}</h2>
            <HanddrawnHeart className="about-makers-heart" />
            <span aria-hidden="true" />
          </header>

          <div className="about-maker-grid">
            <article className="about-maker">
              <strong>{t("Conceal")}</strong>
              <span>{t("Content & UX")}</span>
              <p>{letter.concealDescription}</p>
            </article>
            <span className="about-maker-divider" aria-hidden="true">/</span>
            <article className="about-maker about-maker-design">
              <strong translate="no">范米花儿</strong>
              <span>{t("Design & Dev")}</span>
              <p>{t("做页面的，搭建与维护这个小窝。")}</p>
            </article>
          </div>

        </section>

        <details
          className="about-rights"
          open={rightsOpen}
          onToggle={(event) => setRightsOpen(event.currentTarget.open)}
        >
          <summary>
            <span>{t("RIGHTS & CREDITS")}</span>
            <strong>{t("版权与权利说明")}</strong>
            <small>{t(RIGHTS_SHORT_NOTICE)}</small>
            <i>{t("展开完整说明")}</i>
          </summary>
          <div className="about-rights-content">
            <article>
              <h3>{t("非官方声明")}</h3>
              <p>{t("glfans 是由粉丝自发维护的非商业共创网站，与相关艺人、经纪公司、 剧集制作方、发行平台及品牌不存在隶属、合作或授权关系，页面另有明确说明的除外。")}</p>
            </article>
            <article>
              <h3>{t("内容与权利")}</h3>
              <p>{t("网站原创文字、设计、编排和代码归相应创作者所有。页面涉及的艺人姓名与肖像、 剧照、海报、节目截图、歌曲、官方视频及其他第三方素材，其相关权利归原权利人所有。 引用内容主要用于作品介绍、评论和资料整理，不代表 glfans 对相关素材拥有权利。")}</p>
            </article>
            <article>
              <h3>{t("使用边界")}</h3>
              <p>{t("除页面明确开放的无真人脸表情素材外，glfans 不提供完整剧集、完整音视频、破解资源、 付费内容转载或来源待核实的第三方素材下载，也不会利用艺人肖像暗示代言、合作或进行商品销售。")}</p>
            </article>
            <article>
              <h3>{t("权利反馈")}</h3>
              <p>{t("如您是相关权利人并对页面内容有异议，请提供具体页面地址、涉及内容与处理诉求。 请勿在公开页面提交身份证件等敏感材料；需要进一步核验时再转为非公开沟通。 我们将在核验后及时补充标注、更正、下架或断开链接。")}</p>
              <a href={RIGHTS_FEEDBACK_URL} target="_blank" rel="noreferrer">{t("提交权利反馈")}</a>
            </article>
            <p className="about-rights-copyright">{t("© 2026 glfans，仅指网站原创文字、设计与代码；不涵盖艺人肖像、剧照、海报、音视频及其他第三方素材。")}</p>
          </div>
        </details>
      </section>

      <RepoFilmStrip />
      <RightsNotice className="about-mobile-rights" />
    </main>
  );
}
