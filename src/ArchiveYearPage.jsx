import { t } from "./i18n/runtime.js";
import { seriesName } from './i18n/proper-names.js';
import { getLocale, requireCatalog } from './i18n/runtime.js';
import { withBase } from "./lib/assets.js";
import { ArrowRight, CalendarBlank } from '@phosphor-icons/react';
import { useEffect, useRef } from "react";
import { useMobileLayout } from "./hooks/useMobileLayout.js";
import { SiteHeader } from "./SiteHeader.jsx";
import { archiveYearList } from "./data/archive-dramas.js";
import { useArchiveSelection } from "./features/archive/useArchiveSelection.js";
import { formatArchiveDate, formatArchiveRange } from "./features/archive/archive-format.js";
import "./archive-year-page.css";
import { CpRelatedLinks } from './features/cp/CpRelatedLinks.jsx';

const withArchivePoster = (path) => `${withBase(path)}?v=20260902-hd`;

export function ArchiveYearPage({ year, eventId, onOpenCalendar }) {
  requireCatalog('archive');
  const { yearEvents, hasArchiveEvents, selectedEvent, selectedIndex, selectEvent } = useArchiveSelection(year, eventId);
  const isMobile = useMobileLayout();
  const filmRef = useRef(null);
  const lastScrollAtRef = useRef(-Infinity);
  const scrollSelectionRef = useRef(null);
  const horizontalIntentRef = useRef(false);
  const userScrolledFilmRef = useRef(false);
  const revealedDetailsRef = useRef(false);
  const filmDragRef = useRef({ active: false, startX: 0, startY: 0, startScroll: 0, moved: false, nativeTouch: false });

  const startFilmDrag = (event) => {
    const track = filmRef.current;
    if (!track || !event.isPrimary || event.button !== 0) return;
    const nativeTouch = isMobile && event.pointerType !== "mouse";
    horizontalIntentRef.current = false;
    filmDragRef.current = {
      active: true, startX: event.clientX, startY: event.clientY,
      startScroll: track.scrollLeft, nativeTouch,
      moved: nativeTouch && performance.now() - lastScrollAtRef.current < 140,
    };
    if (nativeTouch) return;
    track.setPointerCapture(event.pointerId);
    track.classList.add("is-dragging");
  };

  const dragFilm = (event) => {
    const track = filmRef.current;
    if (!track || !filmDragRef.current.active) return;
    const delta = event.clientX - filmDragRef.current.startX;
    if (Math.abs(delta) > 6 && Math.abs(delta) > Math.abs(event.clientY - filmDragRef.current.startY)) {
      horizontalIntentRef.current = true;
    }
    if (Math.hypot(delta, event.clientY - filmDragRef.current.startY) > 6) filmDragRef.current.moved = true;
    if (filmDragRef.current.nativeTouch) return;
    track.scrollLeft = filmDragRef.current.startScroll - delta;
  };

  const endFilmDrag = (event) => {
    const track = filmRef.current;
    if (!track || !filmDragRef.current.active) return;
    const wasMoved = filmDragRef.current.moved;
    filmDragRef.current.active = false;
    if (filmDragRef.current.nativeTouch) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track.classList.remove("is-dragging");

    if (!wasMoved) {
      const card = document.elementFromPoint(event.clientX, event.clientY)?.closest(".archive-event-card");
      const next = yearEvents.find((item) => item.id === card?.dataset.eventId);
      if (next) selectEvent(next);
    }
  };

  const cancelFilmDrag = (event) => {
    // Native panning cancels pointer events. Only an actual film scroll below
    // will turn this intent into a request to reveal details.
    if (filmDragRef.current.nativeTouch) horizontalIntentRef.current = true;
    filmDragRef.current.active = false;
    filmDragRef.current.moved = true;
    const track = filmRef.current;
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    track?.classList.remove("is-dragging");
  };

  // A selected deep link or year change should reveal its card without moving the page.
  useEffect(() => {
    // A settled swipe already positioned the card. Do not restart its scrolling.
    if (scrollSelectionRef.current === selectedEvent?.id) {
      scrollSelectionRef.current = null;
      return;
    }
    const track = filmRef.current;
    const card = track?.querySelector(".archive-event-card.is-active");
    if (!track || !card) return;
    const frame = requestAnimationFrame(() => {
      track.scrollTo({
        left: track.scrollLeft + card.getBoundingClientRect().left + card.getBoundingClientRect().width / 2
          - track.getBoundingClientRect().left - track.clientWidth / 2,
        behavior: "instant",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isMobile, year, selectedEvent?.id]);

  // On mobile, let scrolling and snap finish before selecting the centered frame.
  useEffect(() => {
    if (!isMobile) return;
    const track = filmRef.current;
    if (!track) return;
    let settleTimer;
    let hasScrolled = false;
    const selectCenteredCard = () => {
      if (!hasScrolled) return;
      if (filmDragRef.current.active && !filmDragRef.current.nativeTouch) return;
      clearTimeout(settleTimer);
      hasScrolled = false;
      const center = track.getBoundingClientRect().left + track.clientWidth / 2;
      const cards = [...track.querySelectorAll('.archive-event-card')];
      const card = cards.reduce((nearest, candidate) => {
        const distance = (item) => {
          const rect = item.getBoundingClientRect();
          return Math.abs(rect.left + rect.width / 2 - center);
        };
        return !nearest || distance(candidate) < distance(nearest) ? candidate : nearest;
      }, null);
      const next = yearEvents.find((item) => item.id === card?.dataset.eventId);
      if (next && next.id !== selectedEvent?.id) {
        scrollSelectionRef.current = next.id;
        selectEvent(next);
      }
      if (userScrolledFilmRef.current && !revealedDetailsRef.current) {
        revealedDetailsRef.current = true;
        const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mobile-header-height')) || 46;
        const offset = track.closest('.archive-event-browser').getBoundingClientRect().top - headerHeight - 12;
        // Only move down, once per year; never pull someone back up from reading.
        if (offset > 8) window.scrollBy({
          top: offset,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      }
    };
    const scheduleSelection = (event) => {
      if (event.type === 'scroll') hasScrolled = true;
      if (!hasScrolled) return;
      if (event.type === 'scroll' && horizontalIntentRef.current) userScrolledFilmRef.current = true;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(selectCenteredCard, 140);
    };
    track.addEventListener('scroll', scheduleSelection, { passive: true });
    track.addEventListener('scrollend', selectCenteredCard);
    track.addEventListener('pointerup', scheduleSelection);
    track.addEventListener('pointercancel', scheduleSelection);
    return () => {
      clearTimeout(settleTimer);
      track.removeEventListener('scroll', scheduleSelection);
      track.removeEventListener('scrollend', selectCenteredCard);
      track.removeEventListener('pointerup', scheduleSelection);
      track.removeEventListener('pointercancel', scheduleSelection);
    };
  }, [isMobile, yearEvents, selectedEvent?.id, selectEvent]);

  const preview = hasArchiveEvents && (
    <figure
      className="archive-year-preview"
      style={{
        "--archive-media-ratio": selectedEvent.width / selectedEvent.height,
        "--archive-event-focus": selectedEvent.focus,
      }}
    >
      <div className="archive-year-preview-frame">
        <img
          className="archive-year-preview-art"
          src={withArchivePoster(selectedEvent.image)}
          width={selectedEvent.width}
          height={selectedEvent.height}
          alt={t('{0}剧集封面', [seriesName(selectedEvent, getLocale())])}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          data-page-critical="true"
        />
      </div>
      <figcaption>
        <span>{t("FRAME ")}{t(String(selectedIndex + 1).padStart(2, "0"))} / {t(year)}</span>
        <b>{t(selectedEvent.titleEn)}</b>
      </figcaption>
      <span className="archive-year-preview-edge" aria-hidden="true">{t("GL / ARCHIVE")}</span>
    </figure>
  );
  const summary = hasArchiveEvents && (
    <aside className="archive-year-summary" aria-live="polite">
      <time dateTime={selectedEvent.startDate}>{t(formatArchiveRange(selectedEvent))}</time>
      <h2>{seriesName(selectedEvent, getLocale())}</h2>
      <small className="archive-year-original-title">{t(selectedEvent.titleEn)}</small>
      <dl className="archive-year-facts">
        <div><dt>{t("播出")}</dt><dd>{t(selectedEvent.weekday)} · {t(selectedEvent.status)}</dd></div>
        <div><dt>{t("集数")}</dt><dd>{t(selectedEvent.episodes ? `${selectedEvent.episodes} 集` : "待公布")}</dd></div>
        <div><dt>{t("平台")}</dt><dd>{t(selectedEvent.platforms.join(" / ") || selectedEvent.company || "待公布")}</dd></div>
      </dl>
      <div className="archive-year-cast">
        <span>{t("主演")}</span>
        <p translate="no">{selectedEvent.cast?.join(" / ") || t("演员资料整理中")}</p>
      </div>
      <span className="archive-year-summary-brush" aria-hidden="true" />
      <p>{t(selectedEvent.summary)}</p>
      <CpRelatedLinks seriesId={selectedEvent.id} />
      <button className="archive-series-calendar" type="button" aria-haspopup="dialog" onClick={event => onOpenCalendar(event, { ids: [selectedEvent.id], label: seriesName(selectedEvent, getLocale()) })}><CalendarBlank size={18} />{t('查看播出日历')}<ArrowRight size={16} /></button>
      <img src={withBase("assets/repo-handdrawn-heart-pink.webp")} alt="" aria-hidden="true" data-page-critical="true" />
    </aside>
  );

  return (
    <main className="archive-year-page">
      <SiteHeader activePath="archive" />
      <div className="archive-year-main">
        <a
          className="archive-year-back"
          href="#/archive"
          aria-label={t("返回全部年份")}
          title={t("返回全部年份")}
          onClick={(event) => {
            event.preventDefault();
            window.location.hash = "#/archive";
          }}
        >
          <span>{t("← 返回年份")}</span>
          <strong>{t(year)}</strong>
        </a>

        <section className="archive-year-hero" aria-labelledby="archive-year-title">
          <header className="archive-year-masthead">
            <h1 id="archive-year-title">
              <span className="archive-year-cn-title" aria-label={t("年度胶卷")}>
                {getLocale() !== 'zh' ? <i>{t('年度胶卷')}</i> : ["年", "度", "胶", "卷"].map((character) => (
                  <i aria-hidden="true" key={character}>{t(character)}</i>
                ))}
              </span>
              <strong>{t("YEAR ARCHIVE")}</strong>
            </h1>
            <button className="archive-year-tag archive-calendar-entry" type="button" aria-haspopup="dialog" onClick={onOpenCalendar}>
              <CalendarBlank size={18} aria-hidden="true" />{t('查看播出日历')}<ArrowRight size={18} aria-hidden="true" />
            </button>
          </header>

          {t(hasArchiveEvents ? !isMobile && (
            <>
              {t(preview)}
              {t(summary)}
            </>
          ) : (
            <section className="archive-year-empty">
              <span>{t(year)}</span>
              <h2>{t("这一年没有入档剧集")}</h2>
              <p>{t("当前档案只收录以女性爱情为主线、已经正式播出或确认档期的泰国系列剧。")}</p>
              <a href="#/archive/2022">{t("从 2022《GAP》开始看")}</a>
            </section>
          ))}
        </section>

        <div className="archive-year-switcher-row">
          <nav className="archive-year-switcher" aria-label={t("切换年份")}>
            {t(archiveYearList.map((item) => (
              <a
                className={item === year ? "is-active" : ""}
                href={`#/archive/${item}`}
                onClick={(event) => {
                  event.preventDefault();
                  window.location.hash = `#/archive/${item}`;
                }}
                key={item}
              >
                {t(item)}
              </a>
            )))}
          </nav>
          <img className="archive-year-loop" src={withBase("assets/about/annotation-loop-arrow-v1.webp")} alt="" aria-hidden="true" data-page-critical="true" />
          <p className="archive-year-count" aria-label={t(`${year} 年共收录 ${yearEvents.length} 部剧集`)}>
            <span>{t("本年收录")}</span>
            <strong>{t(String(yearEvents.length).padStart(2, "0"))}</strong>
            <span>{t("部剧集")}</span>
          </p>
        </div>

        {t(hasArchiveEvents && (
          <section className="archive-event-browser" aria-label={t(`${year} 年泰百剧集胶卷`)}>
            <div
              className="archive-event-film-track"
              ref={filmRef}
              onPointerDown={startFilmDrag}
              onPointerMove={dragFilm}
              onPointerUp={endFilmDrag}
              onPointerCancel={cancelFilmDrag}
              onScroll={() => { lastScrollAtRef.current = performance.now(); }}
              onWheel={(event) => {
                if (Math.abs(event.deltaX) > 4 || (event.shiftKey && Math.abs(event.deltaY) > 4)) {
                  horizontalIntentRef.current = true;
                }
              }}
            >
              {t(yearEvents.map((event) => (
                <button
                  className={`archive-event-card${selectedEvent.id === event.id ? " is-active" : ""}`}
                  type="button"
                  onClick={(clickEvent) => {
                    if (clickEvent.detail === 0 || !filmDragRef.current.moved) selectEvent(event);
                    filmDragRef.current.moved = false;
                  }}
                  aria-pressed={selectedEvent.id === event.id}
                  aria-label={`${t(formatArchiveDate(event.startDate))} ${seriesName(event, getLocale())}`}
                  data-event-id={event.id}
                  key={event.id}
                >
                  <img
                    src={withArchivePoster(event.image)}
                    width={event.width}
                    height={event.height}
                    alt=""
                    style={{ "--archive-event-focus": event.focus }}
                    draggable="false"
                    loading={selectedEvent.id === event.id ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={selectedEvent.id === event.id ? "high" : "low"}
                  />
                  <span>
                    <time>{t(formatArchiveDate(event.startDate))}</time>
                    <b>{seriesName(event, getLocale())}</b>
                  </span>
                </button>
              )))}
            </div>
          </section>
        ))}
        {t(isMobile && hasArchiveEvents && (
          <section className="archive-year-details" aria-label={t("所选剧集详情")}>
            {t(summary)}
          </section>
        ))}
      </div>
    </main>
  );
}
