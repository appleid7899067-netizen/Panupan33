#!/usr/bin/env node
import { spawnSync } from "node:child_process";

if (process.env.RENDER !== "true") {
  process.exit(0);
}

console.log("[render-build] Render detected — building production Nitro server.");
const result = spawnSync(process.execPath, ["scripts/with-app-env.mjs", "vite", "build"], {
  stdio: "inherit",
  env: process.env,
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
