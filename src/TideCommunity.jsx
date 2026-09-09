import { t, reactionLabel } from "./i18n/runtime.js";
import { getDateLocale } from './i18n/runtime.js';
import { communityText } from './i18n/community-copy.js';
import {
  ChatCircleDots,
  Eye,
  Heart,
  PaperPlaneTilt,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { getTideTargetKey, tideWordsPageTarget } from "./data/tide-words.js";
import { readSavedNickname } from "./features/community/community-state.js";
import "./tide-community.css";

export { useTideCommunity } from "./features/community/useTideCommunity.js";

export function CommunityReactionButton({ busy = false, compact = false, disabled = false, liked = false, likes = null, onClick }) {
  return (
    <button
      className={`community-reaction${liked ? " is-liked" : ""}${compact ? " is-compact" : ""}`}
      type="button"
      aria-label={reactionLabel(liked, likes)}
      aria-pressed={liked}
      disabled={disabled || busy}
      onClick={onClick}
    >
      <Heart weight={liked ? "fill" : "regular"} aria-hidden="true" />
      <span>{t(likes ?? "—")}</span>
    </button>
  );
}

export function TideCommunitySummary({ community, compact = false }) {
  const pageStats = community.getStats(tideWordsPageTarget.targetType, tideWordsPageTarget.targetId);
  const stats = community.quotes.reduce((totals, quote) => {
    const quoteStats = community.getStats("quote", quote.id);
    return {
      comments: totals.comments + quoteStats.comments,
      likes: totals.likes + quoteStats.likes,
      uniqueVisitors: totals.uniqueVisitors + quoteStats.uniqueVisitors,
      views: totals.views + quoteStats.views,
    };
  }, { ...pageStats });
  const pageKey = getTideTargetKey(tideWordsPageTarget.targetType, tideWordsPageTarget.targetId);

  const numbers = (
    <dl className="tide-community-stats" aria-busy={!community.totalsLoaded}>
      <div><dt><Eye aria-hidden="true" />{t("路过")}</dt><dd>{t(community.totalsLoaded ? stats.views : "—")}</dd></div>
      <div><dt><Heart aria-hidden="true" />{t("心动")}</dt><dd>{t(community.totalsLoaded ? stats.likes : "—")}</dd></div>
      <div><dt><ChatCircleDots aria-hidden="true" />{t("回声")}</dt><dd>{t(community.totalsLoaded ? stats.comments : "—")}</dd></div>
    </dl>
  );

  if (compact) return <section className="mobile-tide-stats" aria-label={t("坑底互动统计")}>{t(numbers)}</section>;

  return (
    <section className="tide-community-summary" aria-labelledby="tide-community-title">
      <div className="tide-community-summary-copy">
        <span>{t("PIT ACTIVITY / LIVE ARCHIVE")}</span>
        <h2 id="tide-community-title">{t("坑底正在发生")}</h2>
      </div>
      {t(numbers)}
      <div className="tide-community-summary-action">
        <CommunityReactionButton
          busy={community.busyTargets.has(pageKey)}
          disabled={!community.configured}
          liked={community.isLiked(tideWordsPageTarget.targetType, tideWordsPageTarget.targetId)}
          likes={pageStats.likes}
          onClick={() => community.toggleReaction(tideWordsPageTarget.targetType, tideWordsPageTarget.targetId)}
        />
        <small>{t(community.configured ? "给整个坑底文学送一次心动" : "互动服务等待社区 API")}</small>
      </div>
    </section>
  );
}

export function CommunityCommentList({ comments, state }) {
  if (state === "loading") {
    return <p className="community-comments-state"><SpinnerGap className="is-spinning" aria-hidden="true" />{t(" 正在捞回声")}</p>;
  }
  if (state === "error") return <p className="community-comments-state">{t("回声暂时没有捞上来。")}</p>;
  if (!comments.length) return null;

  return (
    <ol className="community-comment-list">
      {comments.map((comment) => (
        <li key={comment.id}>
          <header>
            <strong translate="no">{comment.nickname === '匿名坑底人' ? t(comment.nickname) : comment.nickname}</strong>
            <time dateTime={comment.created_at}>{new Intl.DateTimeFormat(getDateLocale(), { month: getDateLocale() === 'zh-CN' ? 'numeric' : 'short', day: 'numeric' }).format(new Date(comment.created_at))}</time>
          </header>
          <p>{communityText(comment.body)}</p>
        </li>
      ))}
    </ol>
  );
}

export function CommunityCommentForm({ autoFocusBody = false, bodyMaxLength = 400, configured, footerTarget = null, onSubmit, placeholder, submitLabel = "留下这句" }) {
  const formId = useId();
  const [nickname, setNickname] = useState(readSavedNickname);
  const [body, setBody] = useState("");
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!configured || state === "submitting") return;
    setState("submitting");
    setMessage("");
    const result = await onSubmit({ nickname, body });
    if (result.ok) {
      setBody("");
      setState("success");
      setMessage(result.message || "收到了，已经浮到坑底。");
    } else {
      setState("error");
      setMessage(result.message);
    }
  };

  const footer = (
    <div className="community-comment-form-footer">
      <span aria-live="polite">{t(message)}</span>
      <button type="submit" form={formId} disabled={!configured || state === "submitting" || body.trim().length < 2}>
        {t(state === "submitting" ? <SpinnerGap className="is-spinning" aria-hidden="true" /> : <PaperPlaneTilt weight="bold" aria-hidden="true" />)}
        {t(state === "submitting" ? "正在送出" : submitLabel)}
      </button>
    </div>
  );

  return (
    <form id={formId} className="community-comment-form" onSubmit={handleSubmit}>
      <label>
        <span>{t("怎么称呼你")}</span>
        <input
          type="text"
          value={nickname}
          maxLength={24}
          placeholder={t("匿名坑底人")}
          disabled={!configured}
          onChange={(event) => setNickname(event.target.value)}
        />
      </label>
      <label>
        <span>{t("留下回声")}</span>
        <textarea
          autoFocus={autoFocusBody}
          value={body}
          minLength={2}
          maxLength={bodyMaxLength}
          required
          rows={4}
          placeholder={t(configured ? (placeholder || "说点什么，接梗也行。") : "互动服务配置完成后开放留言。")}
          disabled={!configured}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      {t(footerTarget ? createPortal(footer, footerTarget) : footer)}
    </form>
  );
}

export function TideGuestbook({ community }) {
  return (
    <section className="tide-guestbook is-empty" aria-labelledby="tide-guestbook-title">
      <div className="tide-guestbook-heading">
        <span>{t("PUBLIC GUESTBOOK")}</span>
        <h2 id="tide-guestbook-title">{t("坑底留言板")}</h2>
      </div>
      <CommunityCommentForm
        bodyMaxLength={120}
        configured={community.configured}
        placeholder={t("写下一句坑底原话。")}
        submitLabel="投到上面"
        onSubmit={async ({ nickname, body }) => {
          const result = await community.submitQuote({ nickname, body });
          if (result.ok) {
            window.setTimeout(() => {
              document.querySelector(`[data-evidence-id="${result.quoteId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 80);
          }
          return result;
        }}
      />
    </section>
  );
}

export function QuoteCommentModal({ community }) {
  const composerQuote = community.composerQuote;

  useEffect(() => {
    if (!composerQuote) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") community.closeComposer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [composerQuote, community.closeComposer]);

  if (!composerQuote) return null;
  const quoteLabel = /^q-\d+$/i.test(composerQuote.id) ? composerQuote.id.toUpperCase() : "NEW VOICE";

  return createPortal(
    <div className="quote-comment-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) community.closeComposer();
    }}>
      <aside className="quote-comment-modal is-composer" role="dialog" aria-modal="true" aria-labelledby="quote-comment-title">
        <header className="quote-comment-modal-header">
          <span>{t(quoteLabel)}{t(" / LEAVE A REPLY")}</span>
          <button className="dialog-close-button" type="button" onClick={community.closeComposer} aria-label={t("关闭评论")}>
            <X weight="bold" aria-hidden="true" />
          </button>
        </header>
        <div className="quote-comment-featured">
          <blockquote id="quote-comment-title">{communityText(composerQuote.text)}</blockquote>
          <small translate="no">— {composerQuote.speaker === '匿名坑底人' ? t(composerQuote.speaker) : composerQuote.speaker}</small>
        </div>
        <CommunityCommentForm
          autoFocusBody
          configured={community.configured}
          onSubmit={async ({ nickname, body }) => {
            const result = await community.submitComment({
              targetType: "quote",
              targetId: composerQuote.id,
              nickname,
              body,
            });
            if (result.ok) community.closeComposer();
            return result;
          }}
        />
      </aside>
    </div>,
    document.body,
  );
}
