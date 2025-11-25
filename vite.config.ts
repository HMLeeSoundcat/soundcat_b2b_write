import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { visualizer } from "rollup-plugin-visualizer";

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
});
