import { t } from "./i18n/runtime.js";
import { getLocale } from './i18n/runtime.js';
import { withBase } from "./lib/assets.js";
import { useState } from "react";
import { SiteHeader } from "./SiteHeader.jsx";
import { RightsNotice } from "./RightsNotice.jsx";
import { RIGHTS_FEEDBACK_URL, RIGHTS_SHORT_NOTICE } from "./rights.js";
import "./about-page.css";


const aboutCopy = {
  zh: {
    intro: 'glfans 是由粉丝维护的非官方、非商业泰百影视资料站。考古档案按年份整理剧集；播出日历汇总已公布的排期；百家饭记录演员公开资料、共同作品与职业经历。REPO 收录剧集相关文章，也可以来捡一张表情包。',
    sections: '考古档案 · 播出日历 · 百家饭 · REPO · 表情包',
    heading: '公开资料索引',
    note: '资料以公开来源为依据，保留来源与核对时间，并持续更正、补充。',
    declaration: 'glfans 是由粉丝维护的非官方、非商业资料站，与相关艺人、经纪公司、剧集制作方、发行平台及品牌不存在隶属、合作或授权关系，页面另有明确说明的除外。',
    boundaries: 'glfans 不提供完整剧集、完整音视频、破解资源、付费内容转载或来源待核实的第三方素材下载，也不会利用艺人肖像暗示代言、合作或进行商品销售。',
  },
  en: {
    intro: 'glfans is an unofficial, non-commercial archive maintained by fans of Thai GL series. The series archive organizes works by year, the airing calendar lists announced schedules, and the CP archive collects public actor profiles, shared works and career histories. REPO collects series-related articles, alongside a collection of reaction images.',
    sections: 'Series · Calendar · CPs · REPO · Memes',
    heading: 'A public archive',
    note: 'Entries are based on public sources, with references and review dates retained for ongoing corrections and updates.',
    declaration: 'glfans is an unofficial, non-commercial archive maintained by fans. Unless explicitly stated on a page, it is not affiliated with, partnered with or authorized by the artists, agencies, producers, distributors or brands mentioned.',
    boundaries: 'glfans does not provide full series, complete audio or video, cracked resources, reposts of paid content or downloads of third-party material with unverified sources. Artist likenesses are not used to imply endorsements or partnerships, or to sell products.',
  },
  th: {
    intro: 'glfans เป็นคลังข้อมูลซีรีส์ GL ไทยที่แฟน ๆ ดูแลอย่างไม่เป็นทางการและไม่แสวงหากำไร คลังซีรีส์จัดเรียงผลงานตามปี ปฏิทินออกอากาศรวบรวมกำหนดการที่ประกาศแล้ว และคลังคู่รวบรวมข้อมูลสาธารณะของนักแสดง ผลงานร่วมกัน และเส้นทางการทำงาน REPO รวบรวมบทความเกี่ยวกับซีรีส์ พร้อมคลังภาพมีม',
    sections: 'ซีรีส์ · ปฏิทิน · คู่นักแสดง · REPO · มีม',
    heading: 'คลังข้อมูลสาธารณะ',
    note: 'ข้อมูลอ้างอิงจากแหล่งสาธารณะ พร้อมระบุแหล่งที่มาและวันที่ตรวจสอบ เพื่อแก้ไขและเพิ่มเติมอย่างต่อเนื่อง',
    declaration: 'glfans เป็นคลังข้อมูลที่แฟน ๆ ดูแลอย่างไม่เป็นทางการและไม่แสวงหากำไร ไม่มีความเกี่ยวข้อง ความร่วมมือ หรือการอนุญาตจากศิลปิน ต้นสังกัด ผู้ผลิต ผู้เผยแพร่ หรือแบรนด์ที่กล่าวถึง เว้นแต่หน้าเว็บจะระบุไว้อย่างชัดเจน',
    boundaries: 'glfans ไม่ให้บริการซีรีส์เต็มตอน เสียงหรือวิดีโอฉบับเต็ม เนื้อหาละเมิดระบบป้องกัน การเผยแพร่เนื้อหาที่ต้องชำระเงินซ้ำ หรือการดาวน์โหลดสื่อของบุคคลที่สามที่ยังไม่ได้ตรวจสอบแหล่งที่มา และไม่ใช้ภาพศิลปินเพื่อสื่อถึงการรับรอง ความร่วมมือ หรือการขายสินค้า',
  },
};

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
