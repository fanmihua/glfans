import { t } from "../../i18n/runtime.js";
import { ArrowCounterClockwise, DownloadSimple, Question, Sparkle } from "@phosphor-icons/react";
import { PageLoader } from "../../PageLoader.jsx";
import { withBase } from "../../lib/assets.js";
import { memeGameCriticalAssets, memeCaptureDeck } from "./meme-data.js";
import { useMemeCapture } from "./useMemeCapture.js";

export function MemePickupPage() {
  const {
    assetsReady, preparedAssetCount, phase, selectedMeme, activeFilmIndex,
    capturedFilms, targetSlotIndex, archiveMotion, filmstripRef, printRef,
    filmLandingRef, isDeckExhausted, startCapture, captureError,
  } = useMemeCapture();

  if (!assetsReady) {
    const progress = Math.round((preparedAssetCount / memeGameCriticalAssets.length) * 100);

    return <PageLoader className="meme-game-loader" kicker="MEME PIT" label="正在装填表情包" progress={progress} />;
  }

  return (
    <section className={`meme-game meme-game-${phase} meme-game-assets-ready${isDeckExhausted ? " is-complete" : ""}`} aria-labelledby="meme-game-title">
      <div className="meme-game-hero">
        <div className="meme-game-intro">
          <img
            className="meme-title-heart"
            src={withBase("assets/repo-handdrawn-heart-pink.webp")}
            alt=""
            aria-hidden="true"
          />
          <h1 className="meme-game-heading" id="meme-game-title" aria-label={t("MEME PIT")}>
            <span className="meme-heading-line is-meme" aria-hidden="true">
              {t(Array.from("MEME").map((character, index) => <i key={`${character}-${index}`}>{t(character)}</i>))}
            </span>
            <strong className="meme-heading-line is-pit" aria-hidden="true">
              {t(Array.from("PIT").map((character, index) => <i key={`${character}-${index}`}>{t(character)}</i>))}
            </strong>
            <img
              className="meme-title-underline"
              src={withBase("assets/repo-handdrawn-underline-pink.webp")}
              alt=""
              aria-hidden="true"
            />
          </h1>
          <p className="meme-game-tagline">{t("请看镜头，")}<em>{t("保持嘴硬")}</em>
            <span className="meme-title-spark" aria-hidden="true"><Sparkle weight="fill" /></span>
          </p>
        </div>

        <div className={`instant-camera-stage is-${phase}`}>
          <div className="instant-camera-visual">
            {t(selectedMeme && !["idle", "focusing"].includes(phase) && (
              <div className="instant-print-rail">
                <figure
                  className="instant-print"
                  ref={printRef}
                  style={archiveMotion ? {
                    "--archive-x": `${archiveMotion.x}px`,
                    "--archive-y": `${archiveMotion.y}px`,
                    "--archive-scale": archiveMotion.scale,
                  } : undefined}
                >
                  <span className="instant-print-photo">
                    <img src={withBase(selectedMeme.src)} alt={t(selectedMeme.alt)} />
                    <i className="instant-print-wash" aria-hidden="true" />
                  </span>
                  <figcaption>
                    <b>[{t(selectedMeme.filmId)}]</b>
                    <time dateTime={selectedMeme.capturedAt}>{t(selectedMeme.capturedTime)}</time>
                  </figcaption>
                </figure>
              </div>
            ))}

            <img
              className="instant-camera-image"
              src={withBase("assets/meme-game/meme-camera-three-quarter-empty-v2.webp")}
              alt={t("带轻微侧视厚度的黑色与奶油白拍立得相机")}
              decoding="async"
              fetchPriority="high"
            />

            <button
              className="instant-camera-shutter"
              type="button"
              aria-label={isDeckExhausted ? t("{0} 张表情包已全部收齐", [memeCaptureDeck.length]) : t("按下快门拍一张表情包")}
              onClick={startCapture}
              disabled={phase !== "idle" || isDeckExhausted}
            />
            <span className="instant-camera-focus-label" aria-hidden="true">
              <i />
              {t(isDeckExhausted && phase === "idle"
                ? "今天已收齐"
                : phase === "focusing"
                ? "对焦中"
                : phase === "ejecting"
                  ? "出片中"
                  : phase === "developing"
                    ? "显影中"
                    : phase === "revealed"
                      ? "已显影"
                    : phase === "archiving"
                      ? "已收好"
                      : "按住对焦")}
            </span>
          </div>
        </div>
      </div>

      <div className="meme-filmstrip-shell">
        <div className="meme-filmstrip" ref={filmstripRef}>
          <div className="meme-filmstrip-track">
            {t(Array.from({ length: Math.max(6, capturedFilms.length + 1) }).map((_, index) => {
              const meme = capturedFilms[index];
              const showCompletionNote = isDeckExhausted && index === memeCaptureDeck.length;

              return (
                <span
                  className={`meme-film-slot${phase === "archiving" && targetSlotIndex === index ? " is-receiving" : ""}`}
                  key={`film-slot-${index}`}
                  ref={targetSlotIndex === index ? filmLandingRef : null}
                >
                  {t(meme ? (
                    <article
                      className={`meme-film-card is-filled${activeFilmIndex === index ? " is-active" : ""}`}
                      aria-label={t(`第 ${meme.filmId} 张表情包：${meme.title}，拍摄于 ${meme.capturedTime}`)}
                    >
                      <span className="meme-film-image"><img src={withBase(meme.src)} alt="" loading="lazy" decoding="async" /></span>
                      <span className="meme-film-number">[{t(meme.filmId)}]</span>
                      <span className="meme-film-card-actions">
                        <a
                          href={withBase(meme.src)}
                          download={meme.downloadName}
                          aria-label={t(`下载表情包：${meme.title}`)}
                          title={t("下载这张")}
                        >
                          <DownloadSimple aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          onClick={startCapture}
                          disabled={phase !== "idle" || isDeckExhausted}
                          aria-label={isDeckExhausted ? t("{0} 张表情包已全部收齐", [memeCaptureDeck.length]) : t("再拍一张表情包")}
                          title={t(isDeckExhausted ? "今天已经全部收齐" : "再拍一张")}
                        >
                          <ArrowCounterClockwise aria-hidden="true" />
                        </button>
                      </span>
                      <time className="meme-film-time" dateTime={meme.capturedAt}>{t(meme.capturedTime)}</time>
                    </article>
                  ) : showCompletionNote ? (
                    <span className="meme-film-complete" role="status" aria-live="polite">
                      <strong>{t("胶卷拍空啦")}</strong>
                      <small>{t("{0} 张嘴硬证据全到手，", [memeCaptureDeck.length])}<br />{t("再按就要拍到真心了。")}</small>
                    </span>
                  ) : (
                    <span className="meme-film-placeholder" aria-hidden="true">
                      <span className="meme-film-image"><Question className="meme-film-empty-mark" weight="bold" /></span>
                    </span>
                  ))}
                </span>
              );
            }))}
          </div>
        </div>
      </div>
      {captureError && <p className="meme-download-notice" role="status">{t("这张表情包暂时没加载出来，请再拍一次。")}</p>}
      <p className="meme-download-notice">{t("表情包仅供粉丝交流使用，相关素材权利归原权利人。")}</p>
    </section>
  );
}
