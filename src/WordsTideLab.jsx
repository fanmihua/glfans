import { t, reactionLabel } from "./i18n/runtime.js";
import { getLocale } from './i18n/runtime.js';
import { communityText } from './i18n/community-copy.js';
import {
  ChatCircleDots,
  CrownSimple,
  DotsSixVertical,
  Heart,
  PushPin,
  Quotes,
  PencilSimpleLine,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CommunityCommentList,
  QuoteCommentModal,
  TideCommunitySummary,
  TideGuestbook,
} from "./TideCommunity.jsx";
import { useTideCommunity } from "./features/community/useTideCommunity.js";
import { getTideTargetKey } from "./data/tide-words.js";
import { SiteHeader } from "./SiteHeader.jsx";
import { useMobileLayout } from "./hooks/useMobileLayout.js";
import { MobileTideSheet } from "./features/community/MobileTideSheet.jsx";
import { buildEvidenceLayout } from "./features/community/evidence-layout.js";
import { buildFrequencyCurve } from "./features/community/frequency-curve.js";
import "./words-tide-lab.css";
import "./styles/mobile-tide.css";

const frequencyWords = [
  { name: "我懂", value: 118, x: 8, y: 54, tone: "hot", tilt: -0.6 },
  { name: "救命", value: 122, x: 25, y: 30, tone: "hot", tilt: 0.5 },
  { name: "真的", value: 128, x: 43.5, y: 18, tone: "hot", tilt: 0 },
  { name: "感动", value: 115, x: 58, y: 40, tone: "hot", tilt: -0.4 },
  { name: "支持", value: 110, x: 70.5, y: 53, tone: "hot", tilt: 0.4, slug: "support" },
  { name: "想你", value: 84, x: 79, y: 64.5, tone: "hot", tilt: -0.5 },
  { name: "朋友", value: 73, x: 86.5, y: 74, tone: "hot", tilt: 0.4, labelShift: -8, slug: "friend" },
  { name: "CP", value: 52, x: 94, y: 86, tone: "hot", tilt: -0.4, labelShift: -4, labelLift: 25, slug: "cp" },
  { name: "喜欢", value: 44, x: 101.5, y: 92, tone: "hot", tilt: 0.3, labelShift: -36, labelBelow: true },
];

const frequencyCurvePath = "M-220 332 C-95 334 20 325 80 216 C120 144 205 116 250 120 C318 124 370 72 435 72 C492 72 527 150 580 160 C631 170 664 209 705 212 C742 215 760 255 790 258 C824 262 836 295 865 296 C900 298 912 343 940 344 C972 345 990 365 1015 368 C1032 370 1048 372 1060 373";
const mobileFrequencyCurve = buildFrequencyCurve([
  { x: 0, y: 282 },
  ...frequencyWords.map((word) => ({ x: word.x * 10, y: word.y * 4 })),
  { x: 1060, y: 373 },
]);

const flowPointDelay = (x) => (
  `${Math.max(180, Math.round((((x * 10) + 220) / 1280) * 1050 - 12))}ms`
);

const evidenceOrderStorageKey = "gl-pit:evidence-card-order:v1";
const sortOptions = [
  { id: "latest", label: "最新" },
  { id: "likes", label: "心动" },
  { id: "comments", label: "回声" },
  { id: "manual", label: "我的排序" },
];

function getEvidenceColumnCount() {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 800) return 2;
  if (window.innerWidth >= 1680) return 4;
  return 3;
}

function readEvidenceOrder(items) {
  const itemIds = items.map((item) => item.id);
  if (typeof window === "undefined") return itemIds;

  try {
    const saved = JSON.parse(window.sessionStorage.getItem(evidenceOrderStorageKey));
    if (!Array.isArray(saved)) return itemIds;
    const validSavedIds = saved.filter((id) => typeof id === "string" && itemIds.includes(id));
    return [...validSavedIds, ...itemIds.filter((id) => !validSavedIds.includes(id))];
  } catch {
    return itemIds;
  }
}

function EvidenceCard({
  busy,
  configured,
  dragOffset,
  item,
  isDragging,
  isExpanded,
  liked,
  comments,
  commentsState,
  onCommentClick,
  onCompose,
  onKeyDown,
  onLike,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  stats,
}) {
  const displayText = communityText(item.text);
  const copyLength = Array.from(displayText).length;
  const copySize = copyLength <= 9 ? "short-copy" : copyLength >= 16 ? "long-copy" : "medium-copy";

  return (
    <article
      className={`words-repo-quote-card ${copySize} no-cover${item.is_pinned ? " is-pinned" : ""}${isExpanded ? " is-expanded" : ""}${isDragging ? " is-dragging" : ""}`}
      style={{
        "--card-tilt": "0deg",
        "--card-y": "0px",
        "--drag-x": `${dragOffset?.x || 0}px`,
        "--drag-y": `${dragOffset?.y || 0}px`,
      }}
      data-evidence-id={item.id}
      data-evidence-pinned={item.is_pinned ? "true" : "false"}
    >
      <button
        className="words-repo-card-open"
        type="button"
        onClick={onOpen}
        aria-expanded={isExpanded}
        aria-label={stats.comments > 0 ? t(isExpanded ? '收起评论：{0}' : '展开评论：{0}', [displayText]) : t('评论：{0}', [displayText])}
      />
      {t(item.is_pinned ? <span className="words-repo-pinned-label"><PushPin weight="fill" aria-hidden="true" />{t("站主置顶")}</span> : null)}
      <div className="words-repo-quote-copy">
        <Quotes aria-hidden="true" weight="fill" />
        <blockquote>{displayText}</blockquote>
        <footer>
          <strong translate="no">— {item.speaker === '匿名坑底人' ? t(item.speaker) : item.speaker}</strong>
        </footer>
      </div>
      <div className="words-repo-card-actions">
        <button
          className={`words-repo-card-like${liked ? " is-liked" : ""}`}
          type="button"
          aria-label={reactionLabel(liked, stats.likes)}
          aria-pressed={liked}
          disabled={!configured || busy}
          onClick={onLike}
        >
          <Heart weight={liked ? "fill" : "regular"} aria-hidden="true" />
          <span>{t(stats.likes ?? "—")}</span>
        </button>
        <button
          className="words-repo-card-meta"
          type="button"
          aria-label={stats.comments == null ? t('查看评论，统计加载中') : stats.comments > 0 ? t(isExpanded ? '收起{0} 条评论' : '展开{0} 条评论', [stats.comments]) : t('留下第一条评论')}
          onClick={onCommentClick}
        >
          <ChatCircleDots weight="bold" aria-hidden="true" />
          {t(stats.comments ?? "—")}
        </button>
      </div>
      {t(!item.is_pinned ? (
        <button
          className="words-repo-drag-handle"
          type="button"
          aria-label={t(`移动卡片：${displayText}`)}
          aria-grabbed={isDragging}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <DotsSixVertical weight="bold" aria-hidden="true" />
        </button>
      ) : null)}
      {t(isExpanded ? (
        <section className="words-card-comments" aria-label={t(`${item.text}的评论`)}>
          <header>
            <span>
              <ChatCircleDots weight="bold" aria-hidden="true" />
              {t(stats.comments == null ? "回声" : `${stats.comments} 条回声`)}
              <i>{t("再点原话收起 ↑")}</i>
            </span>
            <button type="button" onClick={onCompose}>{t("留一句")}</button>
          </header>
          <div className="words-card-comments-scroll">
            <CommunityCommentList comments={comments} state={commentsState} />
          </div>
          {t(stats.comments > comments.length ? <small>{t("先显示最近 ")}{t(comments.length)}{t(" 条")}</small> : null)}
        </section>
      ) : null)}
    </article>
  );
}

function EvidenceCanvas({ community, isMobile, newQuoteId, onCompose }) {
  const [order, setOrder] = useState(() => readEvidenceOrder(community.quotes));
  const [sortMode, setSortMode] = useState("latest");
  const [columnCount, setColumnCount] = useState(getEvidenceColumnCount);
  const [drag, setDrag] = useState(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => { if (newQuoteId) setSortMode("latest"); }, [newQuoteId]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(evidenceOrderStorageKey, JSON.stringify(order));
    } catch {
      // Reordering still works when session storage is unavailable.
    }
  }, [order]);

  useEffect(() => {
    const currentIds = community.quotes.map((item) => item.id);
    setOrder((current) => [
      ...currentIds.filter((id) => !current.includes(id)),
      ...current.filter((id) => currentIds.includes(id)),
    ]);
  }, [community.quotes]);

  useEffect(() => {
    const updateColumnCount = () => setColumnCount(getEvidenceColumnCount());
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  const displayOrder = useMemo(() => {
    const pinnedIds = community.quotes.filter((quote) => quote.is_pinned).map((quote) => quote.id);
    const regularQuotes = community.quotes.filter((quote) => !quote.is_pinned);
    if (sortMode === "manual") {
      return [...pinnedIds, ...order.filter((id) => regularQuotes.some((quote) => quote.id === id))];
    }

    const sorted = [...regularQuotes].sort((left, right) => {
      if (sortMode === "likes") {
        const difference = community.getStats("quote", right.id).likes - community.getStats("quote", left.id).likes;
        if (difference) return difference;
      }
      if (sortMode === "comments") {
        const difference = community.getStats("quote", right.id).comments - community.getStats("quote", left.id).comments;
        if (difference) return difference;
      }
      return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
    });
    return [...pinnedIds, ...sorted.map((quote) => quote.id)];
  }, [community, order, sortMode]);

  const displayColumns = useMemo(() => {
    return buildEvidenceLayout(displayOrder, community.quotes.filter((item) => item.is_pinned).map((item) => item.id), columnCount, isMobile);
  }, [columnCount, displayOrder, community.quotes, isMobile]);

  const beginDrag = (event, cardId) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.preventDefault();
    if (sortMode !== "manual") {
      setOrder(displayOrder);
      setSortMode("manual");
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      cardId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    setDrag({ cardId, x: 0, y: 0 });
  };

  const moveDrag = (event, cardId) => {
    const active = dragRef.current;
    if (!active || active.cardId !== cardId || active.pointerId !== event.pointerId) return;

    setDrag({
      cardId,
      x: event.clientX - active.startX,
      y: event.clientY - active.startY,
    });
  };

  const finishDrag = (event) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;

    const moved = Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 24;
    const cards = Array.from(canvasRef.current?.querySelectorAll(".words-repo-quote-card") || []);
    const source = cards.find((card) => card.dataset.evidenceId === active.cardId);
    const sourceRect = source?.getBoundingClientRect();
    let targetId = null;
    let nearestDistance = Infinity;

    if (moved && sourceRect) {
      cards.forEach((card) => {
        const candidateId = card.dataset.evidenceId;
        if (candidateId === active.cardId || card.dataset.evidencePinned === "true") return;
        const rect = card.getBoundingClientRect();
        const distance = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
        if (distance < nearestDistance && distance < Math.max(rect.width, rect.height) * .72) {
          nearestDistance = distance;
          targetId = candidateId;
        }
      });
    }

    if (targetId !== null) {
      setOrder((current) => {
        const next = [...current];
        const sourcePosition = next.indexOf(active.cardId);
        const targetPosition = next.indexOf(targetId);
        [next[sourcePosition], next[targetPosition]] = [next[targetPosition], next[sourcePosition]];
        return next;
      });
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDrag(null);
  };

  const moveWithKeyboard = (event, cardId) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -columnCount : columnCount;
    setOrder((current) => {
      const next = sortMode === "manual" ? [...current] : [...displayOrder];
      const sourcePosition = next.indexOf(cardId);
      const firstMovablePosition = community.quotes.some((quote) => quote.is_pinned) ? 1 : 0;
      const targetPosition = Math.max(firstMovablePosition, Math.min(next.length - 1, sourcePosition + delta));
      if (sourcePosition === targetPosition) return current;
      [next[sourcePosition], next[targetPosition]] = [next[targetPosition], next[sourcePosition]];
      return next;
    });
    setSortMode("manual");
  };

  return (
    <>
      <header className="words-board-toolbar">
        <div className="words-board-description">
          <span>{t("OPEN VOICE BOARD")}</span>
          <p>{t("按你想看的方式排；拖动任意非置顶卡片，就会切到自己的排序。")}</p>
        </div>
        <div className="words-board-sorts" role="group" aria-label={t("原话排序")}>
          {t(sortOptions.filter((option) => !isMobile || option.id !== "manual").map((option) => (
            <button
              className={sortMode === option.id ? "is-active" : ""}
              type="button"
              aria-pressed={sortMode === option.id}
              onClick={() => setSortMode(option.id)}
              key={option.id}
            >
              {t(option.label)}
            </button>
          )))}
        </div>
        {t(isMobile && (
          <button className="mobile-tide-compose" type="button" onClick={onCompose}>
            <PencilSimpleLine size={16} weight="bold" aria-hidden="true" />{t("留一句")}</button>
        ))}
      </header>
      <div className="words-snap-canvas" ref={canvasRef} aria-describedby={isMobile ? undefined : "words-canvas-instructions"}>
      {t(displayColumns.map(({ cardIds, pinned }, columnIndex) => (
        <div className={`words-snap-column${pinned ? " mobile-pinned-row" : ""}`} key={pinned ? "pinned" : `column-${columnIndex}`}>
        {t(cardIds.map((cardId) => {
        const itemIndex = community.quotes.findIndex((quote) => quote.id === cardId);
        const item = community.quotes[itemIndex];
        if (!item) return null;
        const targetKey = getTideTargetKey("quote", item.id);
        return (
          <EvidenceCard
            busy={community.busyTargets.has(targetKey)}
            configured={community.configured}
            item={item}
            isDragging={drag?.cardId === cardId}
            isExpanded={!isMobile && community.activeQuote?.id === item.id}
            dragOffset={drag?.cardId === cardId ? drag : null}
            key={item.id}
            liked={community.isLiked("quote", item.id)}
            stats={community.getStats("quote", item.id)}
            comments={community.activeQuote?.id === item.id ? community.quoteComments : []}
            commentsState={community.activeQuote?.id === item.id ? community.quoteCommentsState : "idle"}
            onCompose={() => community.openComposer(item)}
            onCommentClick={() => {
              if (isMobile) community.openQuote(item, { skipKnownEmpty: true });
              else if (community.getStats("quote", item.id).comments === 0) community.openComposer(item);
              else if (community.activeQuote?.id === item.id) community.closeQuote();
              else community.openQuote(item);
            }}
            onOpen={() => {
              if (isMobile) community.openQuote(item, { skipKnownEmpty: true });
              else if (community.getStats("quote", item.id).comments === 0) community.openComposer(item);
              else if (community.activeQuote?.id === item.id) community.closeQuote();
              else community.openQuote(item);
            }}
            onLike={() => community.toggleReaction("quote", item.id)}
            onPointerDown={(event) => beginDrag(event, cardId)}
            onPointerMove={(event) => moveDrag(event, cardId)}
            onPointerUp={finishDrag}
            onKeyDown={(event) => moveWithKeyboard(event, cardId)}
          />
        );
        }))}
        </div>
      )))}
      </div>
    </>
  );
}

function FrequencyFlow({ isMobile }) {
  const curvePath = isMobile ? mobileFrequencyCurve.path : frequencyCurvePath;
  const plotX = (x) => `${isMobile ? x / 1.06 : x}%`;
  return (
    <div className="words-frequency-flow" aria-label={t("词频实时演化图")}>
      <div className="words-flow-chart">
        <svg className="words-flow-lines" viewBox={`0 0 ${isMobile ? 1060 : 1000} 400`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="flow-pink-gradient" gradientUnits={isMobile ? "userSpaceOnUse" : undefined} x1="0" y1="0" x2={isMobile ? 1060 : 1} y2="0">
              <stop offset="0%" stopColor="#ff5ca8" />
              <stop offset={isMobile ? `${250 / 1060 * 100}%` : "30%"} stopColor="#090909" />
              <stop offset="100%" stopColor="#090909" />
            </linearGradient>
            <linearGradient id="flow-area-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="72" x2="0" y2="240">
              <stop offset="0%" stopColor="#ff5ca8" stopOpacity=".26" />
              <stop offset="35%" stopColor="#ff5ca8" stopOpacity=".13" />
              <stop offset="70%" stopColor="#ff5ca8" stopOpacity=".035" />
              <stop offset="100%" stopColor="#ff5ca8" stopOpacity="0" />
            </linearGradient>
            <filter id="flow-rough" x="-3%" y="-8%" width="106%" height="116%">
              <feTurbulence type="fractalNoise" baseFrequency=".012 .055" numOctaves="1" seed="7" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale=".7" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
          <path className="flow-area" d={`${curvePath} L1060 400 L${isMobile ? 0 : -220} 400 Z`} />
          <path
            className="flow-line flow-line-hot"
            d={curvePath}
          />
        </svg>

        {t(frequencyWords.map((word) => (
          <span
            className="words-flow-guide"
            style={{
              "--guide-x": plotX(word.x),
              "--guide-y": `${word.y}%`,
              "--point-delay": flowPointDelay(word.x),
            }}
            aria-hidden="true"
            key={`${word.name}-guide`}
          />
        )))}

        {t(frequencyWords.map((word) => (
          <div
            className={`words-flow-point is-${word.tone}${word.labelBelow ? " is-label-below" : ""}${word.slug ? ` word-${word.slug}` : ""}`}
            data-word={word.name}
            style={{
              "--point-x": plotX(word.x),
              "--point-y": `${word.y}%`,
              "--point-tilt": `${word.tilt}deg`,
              "--point-label-shift": `${word.labelShift || 0}px`,
              "--point-label-lift": `${word.labelLift || 13}px`,
              "--point-delay": flowPointDelay(word.x),
            }}
            key={word.name}
          >
            <span className="words-flow-node" aria-hidden="true" />
            <b>
              <span>{communityText(word.name)}</span>
              <small aria-label={t(`，词频 ${word.value}`)}>/ {t(word.value)}</small>
            </b>
          </div>
        )))}

        <CrownSimple className="words-flow-icon words-flow-crown" weight="bold" aria-hidden="true" />
        <Heart className="words-flow-icon words-flow-heart-two" weight="regular" aria-hidden="true" />
      </div>
    </div>
  );
}

export function WordsTideLab() {
  const community = useTideCommunity();
  const isMobile = useMobileLayout();
  const [guestbookOpen, setGuestbookOpen] = useState(false);
  const [newQuoteId, setNewQuoteId] = useState(null);

  useEffect(() => { setGuestbookOpen(false); community.closeQuote(); }, [isMobile, community.closeQuote]);

  return (
    <main className="words-tide-lab">
      <SiteHeader activePath="tide-words" />

      <section className="words-tide-hero" aria-labelledby="words-tide-title">
        <div className="words-tide-intro">
          <span className="words-tide-ghost" aria-hidden="true">{t("WORD TIDE")}</span>
          <span className="words-tide-eyebrow"><i>*</i>{t(" VOICES FROM THE PIT.")}</span>
          <Heart className="words-tide-note-heart" weight="regular" aria-hidden="true" />
          <Heart className="words-tide-note-heart words-tide-note-heart-bottom" weight="regular" aria-hidden="true" />
          <h1 id="words-tide-title" aria-label={t("坑底文学")}>
            <span className="words-tide-title-line is-black">
              {getLocale() === 'zh' ? Array.from('坑底').map((character, index) => <i aria-hidden="true" key={index}>{character}</i>) : <i>{getLocale() === 'en' ? 'Voices' : 'เสียง'}</i>}
            </span>
            <span className="words-tide-title-line is-pink">
              {getLocale() === 'zh' ? Array.from('文学').map((character, index) => <i aria-hidden="true" key={index}>{character}</i>) : <i>{getLocale() === 'en' ? 'from the pit' : 'จากด้อม'}</i>}
            </span>
          </h1>
          <img className="words-keyword-underline" src={`${import.meta.env.BASE_URL}assets/repo-handdrawn-underline-pink.webp`} alt="" aria-hidden="true" data-page-critical="true" />
          <span className="words-tide-label">{t("WORDS / FREQUENCY / TIDE")}</span>
        </div>
        <FrequencyFlow isMobile={isMobile} />
      </section>

      <TideCommunitySummary community={community} compact={isMobile} />

      <section className="words-archive" id="original-words" aria-label={t("原话收藏")}>
        <p className="words-canvas-instructions" id="words-canvas-instructions">{t("点卡片原位展开评论；按住右上角六点把手可交换位置，卡片不会互相重叠。")}</p>
        <EvidenceCanvas community={community} isMobile={isMobile} newQuoteId={newQuoteId} onCompose={() => setGuestbookOpen(true)} />
      </section>
      {t(isMobile ? (
        <>
          {t((guestbookOpen || community.activeQuote) && (
            <MobileTideSheet
              key={guestbookOpen ? "guestbook" : community.activeQuote.id}
              community={community}
              guestbook={guestbookOpen}
              onClose={() => { setGuestbookOpen(false); community.closeQuote(); }}
              onPublished={(id) => {
                setNewQuoteId(id);
                setGuestbookOpen(false);
                requestAnimationFrame(() => document.getElementById("original-words")?.scrollIntoView({ block: "start", behavior: "auto" }));
              }}
            />
          ))}
        </>
      ) : <><TideGuestbook community={community} /><QuoteCommentModal community={community} /></>)}
    </main>
  );
}
