import { t } from "./i18n/runtime.js";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, FilmStrip, Files, ImageSquare, Pause, Play, Quotes, VinylRecord, X } from "@phosphor-icons/react";
import { MOBILE_NAVIGATION } from "./app/mobile-navigation.js";
import { mobileRadioControls } from "./app/mobile-radio-controls.js";
import { hideNativePopoverIfOpen, supportsNativePopover } from "./lib/browser-compat.js";
import { usePitRadio } from "./PitRadioContext.jsx";
import { useMobileLayout } from "./hooks/useMobileLayout.js";
import "./mobile-section-nav.css";

const icons = { "tide-words": Quotes, archive: FilmStrip, column: Files, memes: ImageSquare, radio: VinylRecord };

export function MobileSectionNav({ activePath }) {
  const radio = usePitRadio();
  const { selectedTrack, togglePlayback } = radio;
  const [tap, setTap] = useState({ id: null, count: 0 });
  const [radioOpen, setRadioOpen] = useState(false);
  const isMobile = useMobileLayout();
  const radioPanelId = useId();
  const radioPanelRef = useRef(null);
  const nativePopover = supportsNativePopover();
  const controls = mobileRadioControls({ ...radio, activePath });

  useEffect(() => {
    const panel = radioPanelRef.current;
    if (nativePopover) hideNativePopoverIfOpen(panel);
    setRadioOpen(false);
  }, [activePath, isMobile, nativePopover]);

  const closeRadioPanel = () => {
    if (nativePopover) hideNativePopoverIfOpen(radioPanelRef.current);
    setRadioOpen(false);
  };

  return (
    <nav className="mobile-section-nav" aria-label={t("栏目导航")}>
      <div className="mobile-section-tabs">
        {t(MOBILE_NAVIGATION.map((item) => {
          const Icon = icons[item.id];
          const active = activePath === item.id;
          const playing = item.id === "radio" && controls.isPlaying;
          const quickControls = item.id === "radio" && controls.showQuickControls;
          const Tab = quickControls ? "button" : "a";
          return (
            <Tab
              key={item.id}
              {...(quickControls ? {
                type: "button",
                ...(nativePopover ? { popoverTarget: radioPanelId } : {}),
                "aria-expanded": radioOpen, "aria-controls": radioPanelId,
              } : { href: item.href })}
              className={`mobile-section-tab mobile-section-tab--${item.id}${playing ? " is-playing" : ""}`}
              aria-label={t(quickControls ? `${item.label}，${controls.status}，打开播放控制` : item.label)}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                setTap((previous) => ({ id: item.id, count: previous.count + 1 }));
                if (quickControls && !nativePopover) setRadioOpen((open) => !open);
              }}
            >
              <span className="mobile-tab-paper">
                <span
                  key={tap.id === item.id ? tap.count : 0}
                  className={`mobile-tab-icon${tap.id === item.id ? " is-tapped" : ""}`}
                  aria-hidden="true"
                ><Icon size={24} weight={active ? "fill" : "regular"} /></span>
                <span className="mobile-tab-label">{t(item.shortLabel)}</span>
                {t(playing && <span className="mobile-tab-playing" aria-label={t("正在播放")} />)}
              </span>
            </Tab>
          );
        }))}
      </div>
      <section
        id={radioPanelId}
        ref={radioPanelRef}
        {...(nativePopover ? { popover: "auto" } : { hidden: !radioOpen })}
        className={`mobile-radio-controls${!nativePopover && radioOpen ? " is-fallback-open" : ""}`}
        aria-label={t("电台快捷控制")}
        onToggle={nativePopover ? (event) => setRadioOpen(event.newState === "open") : undefined}
      >
        <header>
          <span>{t("坑底电台")}</span>
          <button
            className="dialog-close-button"
            type="button"
            {...(nativePopover ? { popoverTarget: radioPanelId, popoverTargetAction: "hide" } : { onClick: closeRadioPanel })}
            aria-label={t("关闭电台快捷控制")}
          ><X size={20} /></button>
        </header>
        <p className="mobile-radio-track">{t(selectedTrack?.trackTitle)}</p>
        <p className="mobile-radio-state" aria-live="polite">{t(selectedTrack?.cpName)} · {t(controls.status)}</p>
        <div className="mobile-radio-actions">
          <button type="button" disabled={controls.disabled} onClick={togglePlayback}>
            {t(controls.canPause ? <Pause size={20} weight="fill" aria-hidden="true" /> : <Play size={20} weight="fill" aria-hidden="true" />)}
            {t(controls.action)}
          </button>
          <a href="#/radio" onClick={closeRadioPanel}>{t("进入电台")}<ArrowRight size={18} aria-hidden="true" /></a>
        </div>
      </section>
    </nav>
  );
}
