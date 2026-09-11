import columnData from "./data/column-index.json";
import { t } from "./i18n/runtime.js";
import { withBase } from "./lib/assets.js";
import { Plus } from "@phosphor-icons/react";
import "./repo-film-strip.css";


const filmCollections = [
  { slug: "rival-lover", cover: "assets/column/rival-lover/overview/01-kqpjbbks9obs.webp", focus: "50% 18%" },
  { slug: "us", cover: "assets/column/us/overview/01-jxntbv0oxoli.webp", focus: "50% 58%" },
  { slug: "designing-love", cover: "assets/column/designing-love/overview/01-ft0abcnezobo.webp", focus: "50% 41%" },
  { slug: "poisonous-love", cover: "assets/column/poisonous-love/overview/01-uksdb8nmjojx.webp", focus: "50% 18%" },
  { slug: "my-secret-words", cover: "assets/column/my-secret-words/overview/01-suakby2xcohn.webp", focus: "50% 38%" },
  { slug: "affair", cover: "assets/column/affair/overview/01-biwwbh7aeo6p.webp", focus: "50% 40%" },
].filter((collection) => columnData.collections.some((item) => item.slug === collection.slug));

export function RepoFilmStrip({ critical = false }) {
  return (
    <div className="repo-film-strip" aria-label={t("合集影像胶卷")}>
      <Plus aria-hidden="true" />
      <div className="repo-film-frames" style={{ "--repo-film-count": filmCollections.length }}>
        {t(filmCollections.map((collection) => (
          <span key={collection.slug} style={{ "--repo-film-focus": collection.focus }}>
            <img
              src={withBase(collection.cover)}
              alt=""
              loading={critical ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={critical ? "auto" : "low"}
              data-page-critical={critical ? "true" : undefined}
            />
          </span>
        )))}
      </div>
      <Plus aria-hidden="true" />
    </div>
  );
}
