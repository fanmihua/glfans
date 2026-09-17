import { t } from "./i18n/runtime.js";
import { useState } from "react";
import { FilmStrip, Users } from "@phosphor-icons/react";
import { MOBILE_NAVIGATION } from "./app/mobile-navigation.js";
import "./mobile-section-nav.css";

const icons = { archive: FilmStrip, cp: Users };

export function MobileSectionNav({ activePath }) {
  const [tap, setTap] = useState({ id: null, count: 0 });
  return (
    <nav className="mobile-section-nav" aria-label={t("栏目导航")}>
      <div className="mobile-section-tabs" style={{ '--section-count': MOBILE_NAVIGATION.length }}>
        {MOBILE_NAVIGATION.map((item) => {
          const Icon = icons[item.id];
          const active = activePath === item.id;
          return (
            <a key={item.id} href={item.href}
              className={`mobile-section-tab mobile-section-tab--${item.id}`}
              aria-label={t(item.label)} aria-current={active ? "page" : undefined}
              onClick={() => setTap((previous) => ({ id: item.id, count: previous.count + 1 }))}>
              <span className="mobile-tab-paper">
                <span key={tap.id === item.id ? tap.count : 0}
                  className={`mobile-tab-icon${tap.id === item.id ? " is-tapped" : ""}`} aria-hidden="true">
                  <Icon size={24} weight={active ? "fill" : "regular"} />
                </span>
                <span className="mobile-tab-label">{t(item.shortLabel)}</span>
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
