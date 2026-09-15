import { t } from "../../i18n/runtime.js";
import { getLocale } from '../../i18n/runtime.js';
import { useMemo } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { withBase } from "../../lib/assets.js";
import { ArticleDocument } from "./ArticleDocument.jsx";
import { formatArticleTitle } from "./article-title.js";
import { useReadingProgress } from "./useArticleEffects.js";

function ArticleMastheadSubject({ subject }) {
  const episodeMatch = subject.match(/^(.*?)(\s+EP\s*\d+(?:[–-]\d+)?)$/i);
  if (!episodeMatch) return t(subject);

  return (
    <>
      {t(episodeMatch[1].trim())}
      <span className="article-masthead-episode">{t(episodeMatch[2].trim())}</span>
    </>
  );
}

export function ArticleView({ collection, article }) {
  const progress = useReadingProgress();
  const visibleArticles = collection.articles.filter((item) => !item.hidden);
  const articleIndex = visibleArticles.findIndex((item) => item.slug === article.slug);
  const articleNumber = String(articleIndex + 1).padStart(2, "0");
  const articleSubject = getLocale() === 'zh' ? formatArticleTitle(collection.title, article.title) : t(article.title);
  const nextArticle = visibleArticles[articleIndex + 1];
  const articleImages = useMemo(() => {
    return Array.from(article.xml.matchAll(/<img\b[^>]*\bhref="([^"]+)"/g), (match) => match[1]);
  }, [article.xml]);
  const mastheadImage = articleImages[0] || article.cover || collection.cover;
  const hideOpeningImage = collection.slug === 'rival-lover' && article.slug === 'wine-ep06-07';
  const usePairedLayout = collection.slug === 'rival-lover' && article.slug === 'wine-ep06-07';

  return (
    <article className={`article-view article-magazine${usePairedLayout ? ' article-magazine--paired' : ''}`}>
      <div className="article-toolbar">
        <a className="article-toolbar-back" href={`#/column/${collection.slug}`} aria-label={t('返回{0}合集', [t(collection.title)])}>
          <ArrowLeft aria-hidden="true" />
        </a>
        <span className="article-toolbar-title">
          <small>{t("ARTICLE / ")}{t(articleNumber)}</small>
          <strong>{t(articleSubject)}</strong>
        </span>
        <span className="article-toolbar-track" aria-hidden="true">
          <i style={{ transform: `scaleX(${Math.max(progress, 0.012)})` }} />
        </span>
        <span className="article-toolbar-percent">{t("阅读进度 ")}{t(Math.round(progress * 100))}%</span>
      </div>
      <header className="article-masthead">
        <div className="article-masthead-copy">
          <span className="article-masthead-kicker">{t("ARTICLE / ")}{t(articleNumber)}</span>
          <h1 aria-label={t(article.title)}>
            <span>{t(collection.title)}</span>
            <strong>
              <ArticleMastheadSubject subject={articleSubject} />
              <span className="article-masthead-underline" aria-hidden="true" />
            </strong>
          </h1>
        </div>
        {!hideOpeningImage && <figure className="article-masthead-still" aria-hidden="true">
          <img src={withBase(mastheadImage)} alt="" decoding="async" fetchPriority="high" data-page-critical="true" />
        </figure>}
        <aside className="article-masthead-note">
          <span>{t("EDGE NOTE")}</span>
          <p>{t(article.label)}</p>
        </aside>
      </header>
      {getLocale() !== 'zh' && <p className="article-translation-note">{t('全文译文说明')}</p>}
      <ArticleDocument xml={article.xml} hideTitle hideLeadHeading />
      {t(nextArticle && (
        <nav className="article-next-nav" aria-label={t("下一篇文章")}>
          <span>{t("NEXT ARTICLE")}</span>
          <a href={`#/column/${collection.slug}/${nextArticle.slug}`}>
            <small>{t("下一篇")}</small>
            <strong>{getLocale() === 'zh' ? formatArticleTitle(collection.title, nextArticle.title) : t(nextArticle.title)}</strong>
            <ArrowRight aria-hidden="true" />
          </a>
        </nav>
      ))}
    </article>
  );
}
