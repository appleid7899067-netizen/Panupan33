#!/usr/bin/env node
/**
 * Render postinstall hook.
 *
 * Do NOT run a full `vite build` here.
 * On Render, postinstall runs during `npm install`; a second full build in this
 * phase commonly exits status 1 (OOM / race with Build Command).
 *
 * Production build belongs in the service Build Command only:
 *   npm install && npm run build
 * Start Command:
 *   npm start
 */

if (process.env.RENDER !== "true") {
  process.exit(0);
}

if (process.env.RENDER_BUILD_ON_POSTINSTALL === "true") {
  const { spawnSync } = await import("node:child_process");
  console.log("[render-build] RENDER_BUILD_ON_POSTINSTALL=true — running vite build in postinstall");
  const result = spawnSync(process.execPath, ["scripts/with-app-env.mjs", "vite", "build"], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

console.log(
  "[render-build] Render detected — skipping vite build in postinstall (use Build Command: npm run build).",
);
process.exit(0);
