export function publicColumns(data) {
  return { ...data, collections: data.collections.filter(c => !c.hidden).map(c => ({
    ...c, articles: c.articles.filter(a => !a.hidden),
  })) };
}

const normalize = value => value.replace(/\s+/g, ' ').trim();
const decode = value => value.replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
})[entity]);

export function publicArticleTranslations(dictionary, data) {
  const visible = new Set();
  const hidden = new Set();
  for (const collection of data.collections) for (const article of collection.articles) {
    const strings = collection.hidden || article.hidden ? hidden : visible;
    for (const value of [article.title, article.label, ...Array.from((article.xml || '').matchAll(/>([^<>]+)</g), m => decode(m[1]))]) {
      if (value) strings.add(normalize(value));
    }
  }
  return Object.fromEntries(Object.entries(dictionary).filter(([key]) => !hidden.has(normalize(key)) || visible.has(normalize(key))));
}
