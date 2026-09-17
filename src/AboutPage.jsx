import { t } from "./i18n/runtime.js";
import { getLocale } from './i18n/runtime.js';
import { withBase } from "./lib/assets.js";
import { useState } from "react";
import { SiteHeader } from "./SiteHeader.jsx";
import { RightsNotice } from "./RightsNotice.jsx";
import { RIGHTS_FEEDBACK_URL, RIGHTS_SHORT_NOTICE } from "./rights.js";
import "./about-page.css";
import { aboutCopy } from "./data/site-about.js";



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

export function AboutPage({ defaultRightsOpen = false }) {
  const [rightsOpen, setRightsOpen] = useState(defaultRightsOpen);
  const copy = aboutCopy[getLocale()] || aboutCopy.zh;

  return (
    <main className="about-shell">
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
          <strong className="about-pullquote">{t("这次真的不一样。")}</strong>
          <img
            className="about-loop-arrow"
            src={withBase("assets/about/annotation-loop-arrow-v1.webp")}
            alt=""
            aria-hidden="true"
            data-page-critical="true"
          />
          <p className="about-margin-note">{t("because love")}<br />{t("is real.")}</p>
          <HanddrawnHeart className="about-heart about-heart-margin" />
        </div>

        <div className="about-copy">
          <div className="about-copy-text">
            <p>{copy.intro}</p>
            <p className="about-participation">{copy.note}</p>
          </div>
          <p className="about-top-note">{t("we pit, we write,")}<br />{t("we love.")}</p>
          <HanddrawnHeart className="about-heart about-heart-top" />
        </div>

        <section className="about-makers" aria-labelledby="about-makers-title">
          <header className="about-makers-heading">
            <h2 id="about-makers-title">{t("挖坑的人")}</h2>
            <HanddrawnHeart className="about-makers-heart" />
            <span aria-hidden="true" />
          </header>

          <div className="about-maker-grid">
            <article className="about-maker">
              <strong>{t("Conceal")}</strong>
              <span>{t("Content")}</span>
              <p>{t("写字的，收藏心动与情绪。")}<br />{t("让爱有迹可循。")}</p>
            </article>
            <span className="about-maker-divider" aria-hidden="true">/</span>
            <article className="about-maker about-maker-design">
              <strong translate="no">范米花儿</strong>
              <span>{t("Design & Dev")}</span>
              <p>{t("做页面的，搭建与维护这个小窝。")}<br />{t("让热爱有处安放。")}</p>
            </article>
          </div>

          <p className="about-maker-note">{t("for us,")}<br /><span>{t("for GL.")}</span>
            <img src={withBase("assets/repo-handdrawn-underline-pink.webp")} alt="" aria-hidden="true" decoding="async" />
          </p>
        </section>

        <aside className="about-welcome" aria-label={copy.sections}>
          <strong>{copy.heading}</strong>
          <i aria-hidden="true" />
          <p>{copy.note}</p>
          <HanddrawnHeart className="about-heart about-heart-welcome" />
        </aside>

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
              <p>{copy.declaration}</p>
            </article>
            <article>
              <h3>{t("内容与权利")}</h3>
              <p>{t("网站原创文字、设计、编排和代码归相应创作者所有。页面涉及的艺人姓名与肖像、 剧照、海报、节目截图、歌曲、官方视频及其他第三方素材，其相关权利归原权利人所有。 引用内容主要用于作品介绍、评论和资料整理，不代表 glfans 对相关素材拥有权利。")}</p>
            </article>
            <article>
              <h3>{t("使用边界")}</h3>
              <p>{copy.boundaries}</p>
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

      <RightsNotice className="about-mobile-rights" />
    </main>
  );
}
