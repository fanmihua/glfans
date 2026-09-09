import { useEffect, useRef, useState } from "react";
import { withBase } from "../../lib/assets.js";
import { observeElementResize } from "../../lib/browser-compat.js";
import { memeGameCriticalAssets, memeCaptureDeck } from "./meme-data.js";

let memeGameAssetsPrimed = false;

function preloadMemeAsset(assetPath) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const settle = async () => {
      if (settled) return;
      settled = true;

      if (image.naturalWidth > 0 && typeof image.decode === "function") {
        try {
          await image.decode();
        } catch {
          // The image has already loaded; decoding can still reject in some browsers.
        }
      }

      resolve();
    };

    image.decoding = "async";
    image.onload = settle;
    image.onerror = settle;
    image.src = withBase(assetPath);
  });
}

export function useMemeCapture() {
  const [assetsReady, setAssetsReady] = useState(memeGameAssetsPrimed);
  const [preparedAssetCount, setPreparedAssetCount] = useState(
    memeGameAssetsPrimed ? memeGameCriticalAssets.length : 0,
  );
  const [phase, setPhase] = useState("idle");
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [activeFilmIndex, setActiveFilmIndex] = useState(-1);
  const [capturedFilms, setCapturedFilms] = useState([]);
  const [targetSlotIndex, setTargetSlotIndex] = useState(0);
  const [archiveMotion, setArchiveMotion] = useState(null);
  const timersRef = useRef([]);
  const filmstripRef = useRef(null);
  const printRef = useRef(null);
  const filmLandingRef = useRef(null);
  const nextCaptureNumberRef = useRef(1);
  const centeredSlotRef = useRef(0);
  const isDeckExhausted = capturedFilms.length >= memeCaptureDeck.length;

  const centerMobileSlot = (index, behavior = "smooth") => {
    centeredSlotRef.current = index;
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    const strip = filmstripRef.current;
    const slot = strip?.querySelectorAll(".meme-film-slot")[index];
    if (!strip || !slot) return;
    const slotRect = slot.getBoundingClientRect();
    const stripRect = strip.getBoundingClientRect();
    strip.scrollTo({
      left: strip.scrollLeft + slotRect.left + slotRect.width / 2 - stripRect.left - stripRect.width / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : behavior,
    });
  };

  useEffect(() => {
    const strip = filmstripRef.current;
    if (!assetsReady || !strip) return;
    let lastWidth = -1;
    const handleResize = () => {
      if (strip.clientWidth === lastWidth) return;
      lastWidth = strip.clientWidth;
      centerMobileSlot(centeredSlotRef.current, "instant");
    };
    const observer = observeElementResize(strip, handleResize);
    if (!observer) window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", handleResize);
    };
  }, [assetsReady]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  useEffect(() => {
    document.body.classList.add("meme-game-active");
    return () => {
      clearTimers();
      document.body.classList.remove("meme-game-active");
    };
  }, []);

  useEffect(() => {
    if (memeGameAssetsPrimed) return undefined;

    let active = true;
    let completed = 0;
    let revealTimer = 0;
    let revealFrame = 0;
    const startedAt = window.performance.now();

    const revealInterface = () => {
      if (!active || memeGameAssetsPrimed) return;
      memeGameAssetsPrimed = true;
      revealFrame = window.requestAnimationFrame(() => {
        if (active) setAssetsReady(true);
      });
    };

    Promise.all(memeGameCriticalAssets.map(async (assetPath) => {
      await preloadMemeAsset(assetPath);
      completed += 1;
      if (active) setPreparedAssetCount(completed);
    })).then(() => {
      const elapsed = window.performance.now() - startedAt;
      revealTimer = window.setTimeout(revealInterface, Math.max(0, 280 - elapsed));
    });

    const safetyTimer = window.setTimeout(revealInterface, 15000);

    return () => {
      active = false;
      window.clearTimeout(revealTimer);
      window.clearTimeout(safetyTimer);
      window.cancelAnimationFrame(revealFrame);
    };
  }, []);

  const startCapture = () => {
    if (phase !== "idle" || isDeckExhausted) return;

    clearTimers();
    const capturedMemeIds = new Set(capturedFilms.map((meme) => meme.id));
    const candidates = memeCaptureDeck.filter((meme) => !capturedMemeIds.has(meme.id));
    const sourceMeme = candidates[Math.floor(Math.random() * candidates.length)];
    if (!sourceMeme) return;
    const captureNumber = nextCaptureNumberRef.current;
    const capturedAt = new Date();
    nextCaptureNumberRef.current += 1;
    const nextMeme = {
      ...sourceMeme,
      captureId: `${sourceMeme.id}-${captureNumber}`,
      filmId: String(captureNumber).padStart(2, "0"),
      capturedAt: capturedAt.toISOString(),
      capturedTime: [capturedAt.getHours(), capturedAt.getMinutes(), capturedAt.getSeconds()]
        .map((part) => String(part).padStart(2, "0"))
        .join(":"),
    };
    const targetIndex = capturedFilms.length;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    centerMobileSlot(targetIndex);
    const focusAt = reduceMotion ? 20 : 260;
    const revealAt = reduceMotion ? 40 : 1180;
    const archiveAt = reduceMotion ? 60 : 1640;
    const archiveDuration = reduceMotion ? 80 : 1050;

    const beginArchive = () => {
      const sourceRect = printRef.current?.getBoundingClientRect();
      const targetRect = filmLandingRef.current?.getBoundingClientRect();

      if (sourceRect && targetRect) {
        const isMobile = window.matchMedia("(max-width: 760px)").matches;
        setArchiveMotion({
          x: targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2),
          // Retain the ejected paper's 18% offset and use untransformed sizes;
          // paper and slot keep the same tilt throughout the mobile landing.
          y: targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2)
            + (isMobile ? printRef.current.offsetHeight * 0.18 : 0),
          scale: (isMobile ? filmLandingRef.current.offsetWidth : targetRect.width) / printRef.current.offsetWidth,
        });
      }

      setPhase("archiving");
      timersRef.current.push(window.setTimeout(() => {
        setCapturedFilms((currentFilms) => [...currentFilms, nextMeme]);
        setActiveFilmIndex(targetIndex);
        setSelectedMeme(null);
        setArchiveMotion(null);
        setPhase("idle");
      }, archiveDuration));
    };

    setSelectedMeme(nextMeme);
    setActiveFilmIndex(-1);
    setTargetSlotIndex(targetIndex);
    setArchiveMotion(null);
    setPhase("focusing");
    timersRef.current.push(window.setTimeout(() => setPhase("ejecting"), focusAt));
    timersRef.current.push(window.setTimeout(() => setPhase("revealed"), revealAt));
    timersRef.current.push(window.setTimeout(beginArchive, archiveAt));
  };

  return {
    assetsReady, preparedAssetCount, phase, selectedMeme, activeFilmIndex,
    capturedFilms, targetSlotIndex, archiveMotion, filmstripRef, printRef,
    filmLandingRef, isDeckExhausted, startCapture,
  };
}
