import { t } from "./i18n/runtime.js";
import { useMemo, useRef } from "react";
import { ArrowDown, ArrowRight } from "@phosphor-icons/react";
import { withBase } from "./lib/assets.js";
import { welcomeLinks } from "./app/routes.js";
import { homeCpCards } from "./features/home/home-content.js";
import { useHomeJourney } from "./features/home/useHomeJourney.js";
import { useHomeGravity } from "./features/home/useHomeGravity.js";
import { spreadMobileFallingOrbits, useMobileHomeOrbits } from "./features/home/useMobileHomeOrbits.js";
import { useMobileEyesOrbits } from "./features/home/useMobileEyesOrbits.js";
import { useMobileWelcomeOrbit } from "./features/home/useMobileWelcomeOrbit.js";
import { useDesktopWelcomeOrbit } from "./features/home/useDesktopWelcomeOrbit.js";
import { createMobileFallingMotion } from "./features/home/mobile-falling-motion.js";
import { PitOrbitCurves, EyesOrbitCurves, WelcomeOrbitCurves, PitPortal, HomeRightsNotice } from "./features/home/HomeArtwork.jsx";
import "./home-page.css";
import { LanguageSwitcher } from './i18n/LanguageSwitcher.jsx';
import { getLocale } from './i18n/runtime.js';

const cardClasses = ["cp-card-one", "cp-card-two", "cp-card-three", "cp-card-four", "cp-card-five"];
const placeholderCards = homeCpCards.map((card, index) => ({ ...card, className: cardClasses[index] }));

export function HomePage() {
  const heroRef = useRef(null);
  const eyesRef = useRef(null);
  const welcomeCollageRef = useRef(null);
  const { scene, fallingSeed, advanceJourney, restartJourney } = useHomeJourney();
  const { updateGravity, resetGravity } = useHomeGravity(heroRef, scene);
  const mobileOrbits = useMobileHomeOrbits(heroRef);
  const mobileFallingOrbits = useMemo(() => spreadMobileFallingOrbits(mobileOrbits), [mobileOrbits]);
  const mobileFallingMotion = useMemo(() => createMobileFallingMotion(mobileFallingOrbits, fallingSeed), [mobileFallingOrbits, fallingSeed]);
  const mobileEyesOrbits = useMobileEyesOrbits(eyesRef);
  const mobileWelcomeOrbit = useMobileWelcomeOrbit(welcomeCollageRef);
  const desktopWelcomeOrbit = useDesktopWelcomeOrbit(welcomeCollageRef);
  const mobileFallStyle = mobileOrbits ? {
    "--fall-pit-top": `${mobileOrbits.portal.top}px`,
    "--fall-pit-left": `${mobileOrbits.portal.left}px`,
    "--fall-pit-width": `${mobileOrbits.portal.width}px`,
    "--fall-stage-shift": `${mobileOrbits.stageShift}px`,
    "--fall-center-x": `${mobileOrbits.portal.left + mobileOrbits.portal.width * 0.5}px`,
    "--fall-center-y": `${mobileOrbits.portal.top + mobileOrbits.portal.height * 0.61}px`,
  } : undefined;

  const handleWheel = (event) => {
    if (event.deltaY > 48) advanceJourney();
  };

  return (
    <main className={`pit-home-page is-scene-${scene}`} onWheel={handleWheel}>
      <LanguageSwitcher home />
      <section
        ref={heroRef}
        className="pit-home-hero"
        aria-label={t("glfans 入坑首页")}
        aria-hidden={scene !== "cover"}
        onPointerMove={updateGravity}
        onPointerLeave={resetGravity}
      >
        <p className="pit-home-ghost" aria-hidden="true">{t("glfans")}</p>
        <PitOrbitCurves className="pit-home-orbit-lines" mobileOrbits={mobileOrbits} />

        <aside className="pit-home-handnote" aria-label={t("首页旁注")}>
          <span>{t("Love")}</span>
          <span>{t("is not a feeling.")}</span>
          <span>{t("It's Evidence.")}</span>
          <img src={withBase("assets/repo-handdrawn-heart-pink.webp")} alt="" aria-hidden="true" data-page-critical="true" />
        </aside>

        <div className="pit-home-copy">
          <h1 aria-label={t("这次真的不一样")}>
            <span className="home-title-row home-title-row-one">
              {getLocale() === 'zh' ? <><i>这</i><i>次</i></> : <i>{t('这次')}</i>}
            </span>
            <span className="home-title-row home-title-row-two">
              {getLocale() === 'zh' ? <><i className="is-pink">真</i><i className="is-pink">的</i><i>不</i><i>一</i><i>样</i></> : <i className="is-pink">{t('真的不一样')}</i>}
            </span>
          </h1>
          <p className="pit-home-proof">{t("心动不是感觉，是证据。")}</p>
        </div>

        <div className="pit-home-cp-orbit" aria-label={t("围绕坑口的 CP 入口")}>
          {t(placeholderCards.map((card) => (
            <button
              className={`pit-home-cp-card ${card.className}`}
              type="button"
              onClick={advanceJourney}
              aria-label={t(`从 ${card.name} 开始入坑片头`)}
              key={card.id}
            >
              <img
                src={withBase(card.image)}
                width={card.width}
                height={card.height}
                alt={t(`${card.name} 拼贴照片`)}
                loading="eager"
                decoding="async"
                fetchPriority={card.id === "namtanfilm" || card.id === "emibonnie" ? "high" : "auto"}
                data-page-critical="true"
              />
              <span>{t("VIEW THEIR PIT ")}<ArrowRight weight="bold" aria-hidden="true" /></span>
            </button>
          )))}
        </div>

        <button className="pit-home-portal" type="button" onClick={advanceJourney} aria-label={t("开始入坑片头")}>
          <PitPortal />
          <span className="pit-home-enter-label">
            <b>{t("ENTER THE PIT")}</b>
            <ArrowDown weight="bold" aria-hidden="true" />
          </span>
        </button>

        <div className="pit-home-shortcuts" aria-hidden="true">
          <span className="shortcut-repo">{t("REPO 文专栏")}</span>
          <span className="shortcut-words">{t("坑底文学")}</span>
          <span className="shortcut-memes">{t("来捡表情包")}</span>
        </div>

        <div className="pit-home-footer">
          <p className="pit-home-meta">{t("版面有限 · 仅展示部分 CP · 坑位持续增加")}</p>
          <HomeRightsNotice className="home-rights-cover" />
        </div>
        <p className="pit-home-count"><strong>01</strong><span>{t("CP")}<br />{t("AND COUNTING")}</span></p>
      </section>

      <section ref={eyesRef} className="pit-journey-scene pit-eyes-scene" aria-hidden={scene !== "eyes"}>
        <p className="pit-scene-index">{t("PIT / 02")}</p>
        <p className="pit-scene-brand">{t("glfans ARCHIVE ")}<span>⊕</span></p>
        <h2 aria-label={t("两眼一闭就是磕")}>
          <span className="eyes-title-top">{getLocale() === 'zh' ? <><i>两</i><i>眼</i><i>一</i><i>闭</i></> : <i>{t('两眼一闭')}</i>}</span>
          <strong>{t("就是磕")}</strong>
        </h2>
        <p className="eyes-moment"><i />{t("glfans")}<br />{t("MOMENTS")}</p>
        <img className="eyes-heart" src={withBase("assets/repo-handdrawn-heart-pink.webp")} alt="" aria-hidden="true" />
        <p className="eyes-proof">{t("“心动不是感觉，是证据。”")}</p>
        <span className="eyes-sparkle eyes-sparkle-one" aria-hidden="true">✦</span>
        <span className="eyes-sparkle eyes-sparkle-two" aria-hidden="true">✧</span>
        <div className="eyes-card-run" aria-hidden="true">
          <EyesOrbitCurves mobileOrbits={mobileEyesOrbits} />
          {t(placeholderCards.slice(0, 4).map((card, index) => (
            <img
              className={`eyes-card eyes-card-${index + 1}`}
              src={withBase(card.image)}
              width={card.width}
              height={card.height}
              alt=""
              decoding="async"
              key={`eyes-${card.id}`}
            />
          )))}
        </div>
        <HomeRightsNotice className="home-rights-eyes" />
      </section>

      <section className="pit-journey-scene pit-falling-scene" aria-label={t("坠入坑底的转场")} aria-hidden={scene !== "falling"}>
        <div className="falling-stage" style={mobileFallStyle}>
          <PitPortal className="falling-pit" />
          {t(mobileFallingOrbits && <PitOrbitCurves className="falling-mobile-orbits" mobileOrbits={{ ...mobileFallingOrbits, paths: mobileFallingOrbits.centerPaths }} />)}
          <div className="falling-cards" aria-hidden="true">
            {t(placeholderCards.map((card, index) => (
              <img
                className={`falling-card falling-card-${index + 1}`}
                style={mobileFallingOrbits ? {
                  "--fall-width": `${mobileFallingOrbits.cards[index].width}px`,
                  "--fall-start-rotation": mobileFallingOrbits.cards[index].rotation,
                  "--fall-path": `path('${mobileFallingMotion[index].path}')`,
                  "--fall-end-rotation": `${mobileFallingMotion[index].rotation}deg`,
                  "--fall-duration": `${mobileFallingMotion[index].duration}ms`,
                  "--fall-easing": mobileFallingMotion[index].easing,
                } : undefined}
                src={withBase(card.image)}
                width={card.width}
                height={card.height}
                alt=""
                decoding="async"
                key={`falling-${card.id}`}
              />
            )))}
          </div>
        </div>
      </section>

      <section className="pit-journey-scene pit-welcome-scene" aria-hidden={scene !== "welcome"}>
        <p className="pit-scene-index">{t("PIT / 03")}</p>
        <div className="welcome-route-stops" aria-hidden="true">
          {t(["心动证据库", "深渊放映厅", "表情补给站"].map((label, index) => {
            const point = desktopWelcomeOrbit?.stops[index];
            return <span
              className={`welcome-route-stop stop-${["one", "two", "three"][index]}`}
              key={label}
              style={point ? { left: `${point.x}px`, top: `${point.y}px`, transform: `translate(-50%, -50%) rotate(${[-3, 1, -4][index]}deg)` } : undefined}
            ><i />{t(label)}<i /></span>;
          }))}
        </div>
        <aside className="welcome-handnote" aria-hidden="true">
          <span>{t("Love")}</span><span>{t("is not a feeling.")}</span><span>{t("It's Evidence.")}</span>
          <img src={withBase("assets/repo-handdrawn-heart-pink.webp")} alt="" />
        </aside>
        <h2><span>{t("欢迎来到")}</span><strong>{t("坑底")}</strong>{getLocale() === 'zh' && <i>。</i>}</h2>
        <div className="welcome-collage" ref={welcomeCollageRef}>
          <WelcomeOrbitCurves mobileOrbit={mobileWelcomeOrbit} desktopOrbit={desktopWelcomeOrbit} />
          <p className="welcome-proof">{t("心动不是感觉，是证据。")}</p>
          <PitPortal className="welcome-pit" style={desktopWelcomeOrbit ? { "--welcome-desktop-pit-top": `${desktopWelcomeOrbit.pitTop}px` } : undefined} />
          <button className="welcome-enter-mark" type="button" onClick={restartJourney} aria-label={t("再次入新坑，重看开场")}>{t("再次入新坑 ")}<ArrowDown weight="bold" aria-hidden="true" />
          </button>
          <img
            className="welcome-card welcome-card-left"
            src={withBase(placeholderCards[0].image)}
            width={placeholderCards[0].width}
            height={placeholderCards[0].height}
            alt={t(`${placeholderCards[0].name} 拼贴照片`)}
          />
          <img
            className="welcome-card welcome-card-right"
            src={withBase(placeholderCards[4].image)}
            width={placeholderCards[4].width}
            height={placeholderCards[4].height}
            alt={t(`${placeholderCards[4].name} 拼贴照片`)}
          />
        </div>
        <nav className="pit-welcome-links" aria-label={t("选择坑底栏目")}>
          <div className="pit-welcome-index-label" aria-hidden="true">
            <strong>{t("坑底索引")}</strong>
            <span>CONTENTS / {String(welcomeLinks.length).padStart(2, "0")}</span>
          </div>
          {t(welcomeLinks.map((item, index) => (
            <a href={item.href} key={item.href}>
              <span>{t(String(index + 1).padStart(2, "0"))}</span>
              <strong>{t(item.label)}</strong>
              <ArrowRight weight="bold" aria-hidden="true" />
            </a>
          )))}
        </nav>
        <HomeRightsNotice className="home-rights-welcome" />
      </section>
    </main>
  );
}
