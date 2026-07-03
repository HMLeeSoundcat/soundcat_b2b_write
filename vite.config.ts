import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), visualizer({ filename: "stats.html", gzipSize: true })],
  server: {
    allowedHosts: ["5173.hmlee.me"],
  },
  build: {
    rollupOptions: {
      output: {},
    },
    assetsDir: "apps/b2b_write/assets",
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
