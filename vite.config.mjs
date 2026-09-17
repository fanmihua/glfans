import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from 'node:fs/promises';
import { publicColumns, publicArticleTranslations } from './scripts/lib/public-columns.mjs';

// 原稿保留在仓库；网页资源仅发布开放的文章及其译文。
function publicColumnPayloads() {
  return {
    name: 'public-column-payloads', enforce: 'pre',
    async load(id) {
      if (!/\/src\/(?:data\/column-data|i18n\/(?:en|th)-article)\.json$/.test(id)) return null;
      const source = JSON.parse(await readFile(new URL('./src/data/column-data.json', import.meta.url), 'utf8'));
      const value = id.endsWith('/column-data.json') ? publicColumns(source)
        : publicArticleTranslations(JSON.parse(await readFile(id, 'utf8')), source);
      return JSON.stringify(value);
    },
  };
}

function normalizeBasePath(value = "/") {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

export default defineConfig({
  // VPS and Sites builds target the domain root by default. Alternate hosts,
  // including the retained GitHub Pages fallback, opt in explicitly.
  base: normalizeBasePath(process.env.VITE_BASE_PATH),
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [publicColumnPayloads(), react()],
});
