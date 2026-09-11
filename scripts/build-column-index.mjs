import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../src/data/column-data.json", import.meta.url);
const output = new URL("../src/data/column-index.json", import.meta.url);
const data = JSON.parse(await readFile(source, "utf8"));
// Directory and collection pages need metadata, never every article's body.
const index = {
  collections: data.collections.filter((collection) => !collection.hidden).map((collection) => ({
    ...collection,
    articles: collection.articles.map(({ xml, ...article }) => article),
  })),
};
await writeFile(output, `${JSON.stringify(index, null, 2)}\n`);
