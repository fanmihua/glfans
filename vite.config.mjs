import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
  plugins: [react()],
});
