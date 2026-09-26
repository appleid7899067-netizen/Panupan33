/**
 * Vite config สำหรับบิลด์แอปมือถือ (static) → dist-mobile/
 * ใช้กับ Capacitor เพื่อห่อเป็นแอป Android (APK/AAB)
 *
 *   npm run build:mobile
 */
import { resolve } from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const ROOT = import.meta.dirname;

export default defineConfig({
  root: resolve(ROOT, "mobile"),
  base: "./",
  resolve: {
    alias: { "@": resolve(ROOT, "src") },
  },
  build: {
    outDir: resolve(ROOT, "dist-mobile"),
    emptyOutDir: true,
    target: "es2020",
  },
  plugins: [viteReact(), tailwindcss()],
});
