#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

const root = process.cwd();
const output = join(root, ".grok", "bin", process.platform === "win32" ? "grok.exe" : "grok");
if (existsSync(output)) process.exit(0);

let cargo = true;
try {
  execFileSync("cargo", ["--version"], { stdio: "ignore" });
} catch {
  cargo = false;
}

if (!cargo) {
  if (process.platform === "win32") throw new Error("Rust/Cargo is required to build Grok Build.");
  execFileSync("sh", ["-c", "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"], { stdio: "inherit" });
  process.env.PATH = join(process.env.HOME || "", ".cargo", "bin") + ":" + process.env.PATH;
}

let dotslash = true;
try {
  execFileSync("dotslash", ["--version"], { stdio: "ignore" });
} catch {
  dotslash = false;
}
if (!dotslash && process.platform !== "win32") {
  execFileSync("cargo", ["install", "dotslash"], { stdio: "inherit" });
  process.env.PATH = join(process.env.HOME || "", ".cargo", "bin") + ":" + process.env.PATH;
}

execFileSync("cargo", ["build", "--release", "-p", "xai-grok-pager-bin"], {
  cwd: join(root, "vendor", "grok-build"),
  stdio: "inherit",
});
mkdirSync(dirname(output), { recursive: true });
const built = join(
  root,
  "vendor",
  "grok-build",
  "target",
  "release",
  process.platform === "win32" ? "xai-grok-pager.exe" : "xai-grok-pager",
);
execFileSync("cp", [built, output]);
