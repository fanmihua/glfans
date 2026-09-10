import { t } from "./i18n/runtime.js";
import { withBase } from "./lib/assets.js";
import { useLayoutEffect, useRef } from "react";
import { Info } from "@phosphor-icons/react";
import { SITE_NAVIGATION } from "./app/routes.js";
import { SITE_LOGO } from "./app/brand.js";
import "./site-header.css";
import { LanguageSwitcher } from './i18n/LanguageSwitcher.jsx';


export function SiteHeader({
  activePath = "column",
  immersive = false,
  dark = false,
  descriptor,
  showHome = true,
  showAbout = true,
  extraAction,
  logoSrcSet,
}) {
  const isMemeGame = activePath === "memes";
  const navRef = useRef(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeLink = nav?.querySelector('[aria-current="page"]');
    if (!nav || !activeLink || nav.scrollWidth <= nav.clientWidth) return;

    const targetLeft = activeLink.offsetLeft - (nav.clientWidth - activeLink.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: "auto" });
  }, [activePath, showAbout, showHome]);

  return (
    <header className={`column-header${isMemeGame ? " is-meme-game" : ""}${immersive ? " is-immersive" : ""}${dark ? " is-dark" : ""}`}>
      <a className="brand" href="#/" aria-label={t("返回 glfans 首页")}>
        <img
          className="brand-logo"
          src={withBase(SITE_LOGO.src)}
          srcSet={logoSrcSet}
          sizes={logoSrcSet ? '90px' : undefined}
          width={SITE_LOGO.width}
          height={SITE_LOGO.height}
          alt={t(SITE_LOGO.alt)}
          decoding="async"
          data-page-critical="true"
        />
        {t(descriptor && <span className="column-brand-descriptor">{t(descriptor)}</span>)}
      </a>
      <nav ref={navRef} className="column-header-nav" aria-label={t("主导航")}>
        {t(SITE_NAVIGATION.filter((item) => (
          (showHome || item.id !== "home") && (showAbout || item.id !== "about")
        )).map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={item.id === "about" ? "column-nav-about" : undefined}
            aria-current={activePath === item.id ? "page" : undefined}
          >{t(item.label)}</a>
        )))}
        {t(extraAction && (
          <button type="button" onClick={extraAction.onClick} aria-label={t(extraAction.ariaLabel || extraAction.label)}>
            {t(extraAction.label)}
          </button>
        ))}
      </nav>
      <div className="site-header-language"><LanguageSwitcher /></div>
      <div className="mobile-header-actions">
        {t(extraAction && (
          <button type="button" onClick={extraAction.onClick} aria-label={t(extraAction.ariaLabel || extraAction.label)}>
            {t(extraAction.label)}
          </button>
        ))}
        {t(showAbout && <a href="#/about" aria-label={t("关于 glfans")} aria-current={activePath === "about" ? "page" : undefined}><Info size={24} weight="regular" aria-hidden="true" /></a>)}
      </div>
    </header>
  );
}
