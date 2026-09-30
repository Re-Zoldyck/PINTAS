import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: { modules: { localsConvention: "camelCase" } },
  server: {
    port: 5173,
    // `vercel dev` (port 3000) serves api/; during plain `vite` dev proxy /_api to it.
    proxy: { "/_api": { target: "http://localhost:3000", rewrite: (p) => "/api/index?route=" + p.replace(/^\/_api\/?/, "").split("?")[0] } },
  },
  build: { outDir: "dist", sourcemap: false },
  test: { globals: true, environment: "node", include: ["src/**/*.spec.{ts,tsx}"] },
} as any);
