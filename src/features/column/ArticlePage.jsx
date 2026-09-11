import columnData from "../../data/column-data.json";
import { ArticleView } from "./ArticleView.jsx";
import { requireCatalog } from '../../i18n/runtime.js';

export default function ArticlePage({ collectionSlug, articleSlug }) {
  requireCatalog('article');
  const collection = columnData.collections.find((item) => item.slug === collectionSlug && !item.hidden);
  const article = collection?.articles.find((item) => item.slug === articleSlug && !item.hidden);
  return collection && article ? <ArticleView collection={collection} article={article} /> : null;
}
