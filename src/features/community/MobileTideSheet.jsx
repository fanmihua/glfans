import { t } from "../../i18n/runtime.js";
import { communityText } from '../../i18n/community-copy.js';
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, PencilSimpleLine, X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { CommunityCommentForm, CommunityCommentList } from "../../TideCommunity.jsx";

export function MobileTideSheet({ community, guestbook = false, onClose, onPublished }) {
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const formRef = useRef(null);
  const writeButtonRef = useRef(null);
  const readScrollRef = useRef(0);
  const [writingRequested, setWritingRequested] = useState(false);
  const [notice, setNotice] = useState("");
  const [formFooter, setFormFooter] = useState(null);
  const quote = community.activeQuote;
  const showComments = !guestbook && (community.quoteCommentsMode !== "empty" || community.quoteComments.length > 0);
  const isWriting = !guestbook && (writingRequested || !showComments);
  const previousWritingRef = useRef(isWriting);

  useLayoutEffect(() => {
    if (guestbook || previousWritingRef.current === isWriting) return;
    previousWritingRef.current = isWriting;
    scrollRef.current.scrollTop = isWriting ? 0 : readScrollRef.current;
    const target = isWriting ? formRef.current.querySelector("textarea") : writeButtonRef.current;
    target?.focus({ preventScroll: true });
  }, [guestbook, isWriting]);

  const startWriting = () => {
    readScrollRef.current = scrollRef.current.scrollTop;
    setNotice("");
    setWritingRequested(true);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const viewport = window.visualViewport;
    let viewportFrame = 0;
    const updateViewport = () => {
      dialog.style.setProperty("--sheet-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--sheet-viewport-bottom", `${(viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)}px`);
      window.cancelAnimationFrame(viewportFrame);
      viewportFrame = window.requestAnimationFrame(() => {
        const field = document.activeElement;
        const scroll = scrollRef.current;
        if (!scroll?.contains(field) || !field.matches("input, textarea")) return;
        const bounds = scroll.getBoundingClientRect();
        const input = field.getBoundingClientRect();
        if (input.bottom > bounds.bottom) scroll.scrollTop += input.bottom - bounds.bottom + 8;
        else if (input.top < bounds.top) scroll.scrollTop -= bounds.top - input.top + 8;
      });
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    document.body.style.overflow = "hidden";
    dialog.showModal();
    dialog.querySelector(isWriting ? "textarea" : "button")?.focus({ preventScroll: true });
    return () => {
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.cancelAnimationFrame(viewportFrame);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`mobile-tide-sheet${guestbook ? "" : ` is-quote ${isWriting ? "is-writing" : "is-reading"}`}${showComments ? " is-comments" : ""}`}
      aria-labelledby="mobile-tide-sheet-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="mobile-tide-sheet-panel">
        <header>
          <div className="mobile-tide-sheet-heading">
            {t(isWriting && showComments && <button type="button" onClick={() => setWritingRequested(false)} aria-label={t("返回评论")}><ArrowLeft size={18} /></button>)}
            <h2 id="mobile-tide-sheet-title">{t(guestbook ? "留一句坑底原话" : isWriting ? "写评论" : "这句的回声")}</h2>
          </div>
          <button className="dialog-close-button" type="button" onClick={onClose} aria-label={t(guestbook ? "关闭留言" : "关闭回声")}><X size={22} /></button>
        </header>
        <div className="mobile-tide-sheet-scroll" ref={scrollRef} tabIndex={!guestbook && !isWriting ? 0 : undefined}>
          {!guestbook && quote && (
            <>
              <blockquote>{communityText(quote.text)}<cite translate="no">— {quote.speaker === '匿名坑底人' ? t(quote.speaker) : quote.speaker}</cite></blockquote>
              {t(showComments && <div
                className="mobile-tide-sheet-comments"
                hidden={isWriting}
                role="region"
                aria-label={t("回声列表")}
                aria-busy={community.quoteCommentsState === "loading"}
              >
                <CommunityCommentList comments={community.quoteComments} state={community.quoteCommentsState} community={community} />
              </div>)}
            </>
          )}
          <div ref={formRef} hidden={!guestbook && !isWriting}>
            <CommunityCommentForm
              configured={community.configured}
              footerTarget={formFooter}
              placeholder={t(guestbook ? "写下一句坑底原话。" : "说点什么，接梗也行。")}
              submitLabel={guestbook ? "发布原话" : "留下回声"}
              onSubmit={async ({ nickname, body }) => {
                const result = guestbook
                  ? await community.submitQuote({ nickname, body })
                  : await community.submitComment({ targetType: "quote", targetId: quote.id, nickname, body });
                if (result.ok && guestbook) onPublished(result.quoteId);
                if (result.ok && !guestbook) {
                  readScrollRef.current = 0;
                  setNotice("评论已发布");
                  setWritingRequested(false);
                }
                return result;
              }}
            />
          </div>
        </div>
        <footer className="mobile-tide-sheet-form-actions" ref={setFormFooter} hidden={!guestbook && !isWriting} />
        {t(!guestbook && !isWriting && <footer className="mobile-tide-sheet-reader-actions">
          {t(notice && <p role="status">{t(notice)}</p>)}
          <button ref={writeButtonRef} type="button" onClick={startWriting} disabled={!community.configured}>
            <PencilSimpleLine size={18} aria-hidden="true" />{t("写评论")}</button>
        </footer>)}
      </div>
    </dialog>,
    document.body,
  );
}
