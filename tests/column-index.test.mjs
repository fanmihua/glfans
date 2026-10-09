import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), "utf8"));

test("the lightweight REPO index preserves visible collections and their article routes without article bodies", () => {
  const full = read("column-data");
  const index = read("column-index");
  assert.deepEqual(index.collections.filter(collection => !collection.externalUrl), full.collections.filter((collection) => !collection.hidden).map((collection) => ({
    ...collection,
    articles: collection.articles.map(({ xml, ...article }) => article),
  })));
  const external = index.collections.find(collection => collection.slug === 'my-secret-words');
  assert.equal(external.externalUrl, 'https://www.asianfanfics.com/story/view/1773104/my-secret-words');
  assert.equal(external.ageRating, '18+');
  assert.deepEqual(external.articles, []);
  assert.equal(external.summaryXml, undefined);
  assert.ok(JSON.stringify(index).length < JSON.stringify(full).length / 3);
});
