import { useCallback, useEffect, useRef, useState } from "react";
import {
  isCommunityConfigured,
  loadCommunityReactionState,
  loadCommunityStats,
  loadPublishedCommunityQuotes,
  loadPublishedComments,
  recordCommunityView,
  setCommunityCommentReaction,
  submitCommunityComment,
  submitCommunityQuote,
  toggleCommunityReaction,
} from "../../community-api.js";
import { collectedQuotes, getTideTargetKey, tideWordsPageTarget } from "../../data/tide-words.js";
import { emptyStats, unknownStats, saveNickname, formatCommunityError, getQuoteCommentsMode, mergeTargetStats, mergeReactionState, mergeCommunityStatsRead, mergeCommunityCommentsRead } from "./community-state.js";
import { readCommunitySnapshot, rememberCommunitySnapshot } from "./community-snapshot.js";

export function useTideCommunity() {
  const [statsByTarget, setStatsByTarget] = useState(() => readCommunitySnapshot("stats") ?? {});
  const [statsLoaded, setStatsLoaded] = useState(() => Boolean(readCommunitySnapshot("stats")));
  const [quotes, setQuotes] = useState(() => readCommunitySnapshot("quotes") ?? collectedQuotes);
  const [quotesLoaded, setQuotesLoaded] = useState(() => Boolean(readCommunitySnapshot("quotes")));
  const [likedTargets, setLikedTargets] = useState(() => new Set());
  const [busyTargets, setBusyTargets] = useState(() => new Set());
  const [connectionState, setConnectionState] = useState(isCommunityConfigured ? "connecting" : "unconfigured");
  const [activeQuote, setActiveQuote] = useState(null);
  const [composerQuote, setComposerQuote] = useState(null);
  const [quoteComments, setQuoteComments] = useState([]);
  const [quoteCommentsState, setQuoteCommentsState] = useState("idle");
  const [quoteCommentsMode, setQuoteCommentsMode] = useState("list");
  const quoteRequestRef = useRef(0);
  const statsFreshRef = useRef(false);
  const commentReactionRequests = useRef(new Set());
  const reactionVersion = useRef(0);
  const reactionVersions = useRef(new Map());
  const confirmedReactionChanges = useRef(new Map());
  const [commentReactionErrors, setCommentReactionErrors] = useState({});

  const getStats = useCallback((targetType, targetId) => (
    statsLoaded ? statsByTarget[getTideTargetKey(targetType, targetId)] ?? emptyStats : unknownStats
  ), [statsByTarget, statsLoaded]);

  useEffect(() => {
    if (statsLoaded) rememberCommunitySnapshot("stats", statsByTarget);
  }, [statsByTarget, statsLoaded]);
  useEffect(() => {
    if (quotesLoaded) rememberCommunitySnapshot("quotes", quotes);
  }, [quotes, quotesLoaded]);

  const refreshStats = useCallback(async () => {
    if (!isCommunityConfigured) return;
    const readVersion = reactionVersion.current;
    const nextStats = await loadCommunityStats();
    statsFreshRef.current = true;
    setStatsByTarget((current) => mergeCommunityStatsRead(current, nextStats, reactionVersions.current, readVersion));
    setStatsLoaded(true);
  }, []);

  const closeQuote = useCallback(() => {
    quoteRequestRef.current += 1;
    setActiveQuote(null);
    setComposerQuote(null);
  }, []);
  const closeComposer = useCallback(() => setComposerQuote(null), []);

  useEffect(() => {
    if (!isCommunityConfigured) return undefined;
    let alive = true;

    // Public totals render as soon as they arrive; anonymous sign-in must not
    // delay them, and a failed identity request must not discard valid reads.
    const readVersion = reactionVersion.current;
    const statsRequest = loadCommunityStats().then((nextStats) => {
      if (!alive) return;
      statsFreshRef.current = true;
      setStatsByTarget((current) => mergeCommunityStatsRead(current, nextStats, reactionVersions.current, readVersion));
      setStatsLoaded(true);
    });
    const reactionsRequest = loadCommunityReactionState().then((nextLikedTargets) => {
      if (!alive) return;
      setLikedTargets(mergeReactionState(nextLikedTargets, confirmedReactionChanges.current));
    });
    const quotesRequest = loadPublishedCommunityQuotes().then((nextQuotes) => {
      if (!alive) return;
      setQuotes(nextQuotes);
      setQuotesLoaded(true);
    });
    Promise.allSettled([statsRequest, reactionsRequest, quotesRequest]).then((results) => {
      if (alive) setConnectionState(results.some((result) => result.status === "rejected") ? "error" : "ready");
    });

    recordCommunityView(tideWordsPageTarget.targetType, tideWordsPageTarget.targetId)
      .then((row) => {
        if (!alive || !row) return;
        setStatsByTarget((current) => mergeTargetStats(
          current,
          tideWordsPageTarget.targetType,
          tideWordsPageTarget.targetId,
          {
            uniqueVisitors: Number(row.unique_visitor_count ?? 0),
            views: Number(row.view_count ?? 0),
          },
        ));
      })
      .catch(() => {
        // Reading the page remains available when analytics cannot be recorded.
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!isCommunityConfigured) return undefined;

    const refreshVisibleStats = () => {
      if (document.visibilityState !== "visible") return;
      refreshStats().catch(() => {
        // Keep the last confirmed totals when a background refresh fails.
      });
    };
    const interval = window.setInterval(refreshVisibleStats, 30000);
    window.addEventListener("focus", refreshVisibleStats);
    document.addEventListener("visibilitychange", refreshVisibleStats);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisibleStats);
      document.removeEventListener("visibilitychange", refreshVisibleStats);
    };
  }, [refreshStats]);

  useEffect(() => {
    if (!isCommunityConfigured || !activeQuote || quoteCommentsMode === "empty") return undefined;
    let alive = true;

    const refreshVisibleComments = () => {
      if (document.visibilityState !== "visible") return;
      const readVersion = reactionVersion.current;
      loadPublishedComments("quote", activeQuote.id, 50)
        .then((comments) => {
          if (!alive) return;
          setQuoteComments((current) => mergeCommunityCommentsRead(current, comments, reactionVersions.current, readVersion));
          setQuoteCommentsState("ready");
        })
        .catch(() => {
          // Keep the visible comments when a background refresh fails.
        });
    };
    const interval = window.setInterval(refreshVisibleComments, 30000);
    window.addEventListener("focus", refreshVisibleComments);
    document.addEventListener("visibilitychange", refreshVisibleComments);

    return () => {
      alive = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisibleComments);
      document.removeEventListener("visibilitychange", refreshVisibleComments);
    };
  }, [activeQuote, quoteCommentsMode]);

  const toggleReaction = useCallback(async (targetType, targetId) => {
    if (!isCommunityConfigured) return;
    const key = getTideTargetKey(targetType, targetId);
    if (busyTargets.has(key)) return;

    setBusyTargets((current) => new Set(current).add(key));
    try {
      const result = await toggleCommunityReaction(targetType, targetId);
      reactionVersions.current.set(key, ++reactionVersion.current);
      confirmedReactionChanges.current.set(key, result.liked);
      setLikedTargets((current) => {
        const next = new Set(current);
        if (result.liked) next.add(key);
        else next.delete(key);
        return next;
      });
      setStatsByTarget((current) => mergeTargetStats(current, targetType, targetId, { likes: result.likes }));
    } catch {
      setConnectionState("error");
    } finally {
      setBusyTargets((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, [busyTargets]);

  const toggleCommentReaction = useCallback(async (commentId) => {
    if (!isCommunityConfigured || commentReactionRequests.current.has(commentId)) return;
    const key = getTideTargetKey("comment", commentId);
    commentReactionRequests.current.add(commentId);
    setBusyTargets((current) => new Set(current).add(key));
    setCommentReactionErrors((current) => ({ ...current, [commentId]: "" }));
    try {
      const result = await setCommunityCommentReaction(commentId, !likedTargets.has(key));
      reactionVersions.current.set(key, ++reactionVersion.current);
      confirmedReactionChanges.current.set(key, result.liked);
      setLikedTargets((current) => {
        const next = new Set(current);
        if (result.liked) next.add(key); else next.delete(key);
        return next;
      });
      setQuoteComments((current) => current.map((comment) => comment.id === commentId ? { ...comment, likes: result.likes } : comment));
    } catch {
      setCommentReactionErrors((current) => ({ ...current, [commentId]: "心动没有送达，请重试。" }));
    } finally {
      commentReactionRequests.current.delete(commentId);
      setBusyTargets((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, [likedTargets]);

  const openQuote = useCallback(async (quote, { skipKnownEmpty = false } = {}) => {
    const request = ++quoteRequestRef.current;
    const mode = getQuoteCommentsMode({ skipKnownEmpty, statsLoaded: statsFreshRef.current, commentCount: getStats("quote", quote.id).comments });
    setActiveQuote(quote);
    setQuoteComments([]);
    setQuoteCommentsMode(mode);
    if (!isCommunityConfigured) {
      setQuoteCommentsState("idle");
      return;
    }

    setQuoteCommentsState(mode === "empty" ? "ready" : "loading");
    const viewPromise = recordCommunityView("quote", quote.id)
      .then((row) => {
        if (!row) return;
        setStatsByTarget((current) => mergeTargetStats(current, "quote", quote.id, {
          uniqueVisitors: Number(row.unique_visitor_count ?? 0),
          views: Number(row.view_count ?? 0),
        }));
      })
      .catch(() => {});

    // The card's confirmed zero count is enough: no empty-list request or spinner.
    if (mode === "empty") {
      await viewPromise;
      return;
    }

    try {
      const readVersion = reactionVersion.current;
      const comments = await loadPublishedComments("quote", quote.id, 50);
      if (request === quoteRequestRef.current) {
        setQuoteComments((current) => mergeCommunityCommentsRead(current, comments, reactionVersions.current, readVersion));
        setQuoteCommentsState("ready");
        if (skipKnownEmpty && comments.length === 0) setQuoteCommentsMode("empty");
      }
    } catch {
      if (request === quoteRequestRef.current) setQuoteCommentsState("error");
    }
    await viewPromise;
  }, [getStats, statsLoaded]);

  const openComposer = useCallback((quote) => {
    setComposerQuote(quote);
  }, []);

  const submitComment = useCallback(async ({ targetType, targetId, nickname, body }) => {
    const cleanedNickname = nickname.trim() || "匿名坑底人";
    const cleanedBody = body.trim();
    try {
      const result = await submitCommunityComment({
        targetType,
        targetId,
        nickname: cleanedNickname,
        body: cleanedBody,
      });
      const publishedComment = {
        id: result.id,
        target_type: targetType,
        target_id: targetId,
        nickname: cleanedNickname,
        body: cleanedBody,
        status: result.status,
        created_at: result.created_at,
        likes: 0,
      };
      if (targetType === "quote") {
        setQuoteComments((current) => [publishedComment, ...current].slice(0, 50));
        setQuoteCommentsState("ready");
        setQuoteCommentsMode("list");
      }
      setStatsByTarget((current) => {
        const previous = current[getTideTargetKey(targetType, targetId)] ?? emptyStats;
        return mergeTargetStats(current, targetType, targetId, { comments: previous.comments + 1 });
      });
      saveNickname(cleanedNickname === "匿名坑底人" ? "" : cleanedNickname);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: formatCommunityError(error) };
    }
  }, []);

  const submitQuote = useCallback(async ({ nickname, body }) => {
    const cleanedSpeaker = nickname.trim() || "匿名坑底人";
    const cleanedText = body.trim();
    try {
      const quote = await submitCommunityQuote({ speaker: cleanedSpeaker, text: cleanedText });
      setQuotes((current) => [quote, ...current.filter((item) => item.id !== quote.id)]);
      saveNickname(cleanedSpeaker === "匿名坑底人" ? "" : cleanedSpeaker);
      return { ok: true, quoteId: quote.id, message: "已经上岸，在上面的原话卡片里。" };
    } catch (error) {
      return { ok: false, message: formatCommunityError(error) };
    }
  }, []);

  return {
    activeQuote,
    busyTargets,
    closeComposer,
    closeQuote,
    composerQuote,
    commentReactionErrors,
    configured: isCommunityConfigured,
    connectionState,
    statsLoaded,
    totalsLoaded: statsLoaded && quotesLoaded,
    getStats,
    isLiked: (targetType, targetId) => likedTargets.has(getTideTargetKey(targetType, targetId)),
    openComposer,
    openQuote,
    quoteComments,
    quoteCommentsMode,
    quoteCommentsState,
    quotes,
    refreshStats,
    submitComment,
    submitQuote,
    toggleReaction,
    toggleCommentReaction,
  };
}
