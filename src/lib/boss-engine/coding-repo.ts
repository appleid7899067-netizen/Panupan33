/**
 * Phase 2 — Repo Understanding
 */

export type RepoMap = {
  rootFiles: string[];
  packages: string[];
  routes: string[];
  configs: string[];
  entryPoints: string[];
  architectureNotes: string[];
  packageJsonSummary?: {
    name?: string;
    dependencies: string[];
    devDependencies: string[];
    scripts: string[];
  };
};

const CONFIG_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "tailwind.config.ts",
  "tailwind.config.js",
  "eslint.config.mjs",
  "eslint.config.js",
  ".env.example",
  "docker-compose.yml",
  "vercel.json",
  "netlify.toml",
]);

const ENTRY_HINTS = ["src/main.tsx", "src/main.ts", "src/index.tsx", "src/index.ts", "src/app.tsx", "src/App.tsx", "src/router.tsx", "app/page.tsx", "pages/index.tsx"];

export function buildRepoMap(paths: string[], packageJsonRaw?: string): RepoMap {
  const normalized = paths.map((p) => p.replace(/^\.\//, "")).filter(Boolean);
  const rootFiles = normalized.filter((p) => !p.includes("/")).slice(0, 40);
  const packages = normalized.filter((p) => p.includes("package.json"));
  const routes = normalized.filter(
    (p) =>
      /src\/routes\//.test(p) ||
      /src\/app\//.test(p) ||
      /pages\//.test(p) ||
      /app\/.*page\.(t|j)sx?$/.test(p),
  );
  const configs = normalized.filter((p) => CONFIG_NAMES.has(p.split("/").pop() || "") || /\.config\.(ts|js|mjs)$/.test(p));
  const entryPoints = ENTRY_HINTS.filter((e) => normalized.includes(e));

  const architectureNotes: string[] = [];
  if (normalized.some((p) => p.startsWith("src/routes/"))) architectureNotes.push("File-based routes under src/routes (TanStack-style)");
  if (normalized.some((p) => p.startsWith("app/"))) architectureNotes.push("Next.js app directory present");
  if (normalized.some((p) => p.includes("components/"))) architectureNotes.push("Shared components directory");
  if (normalized.some((p) => p.includes("lib/"))) architectureNotes.push("lib/ utilities present");
  if (normalized.some((p) => p.includes("server/"))) architectureNotes.push("server/ directory present");

  let packageJsonSummary: RepoMap["packageJsonSummary"];
  if (packageJsonRaw) {
    try {
      const pkg = JSON.parse(packageJsonRaw) as Record<string, unknown>;
      packageJsonSummary = {
        name: typeof pkg.name === "string" ? pkg.name : undefined,
        dependencies: Object.keys((pkg.dependencies as object) || {}),
        devDependencies: Object.keys((pkg.devDependencies as object) || {}),
        scripts: Object.keys((pkg.scripts as object) || {}),
      };
    } catch {
      /* ignore */
    }
  }

  return { rootFiles, packages, routes, configs, entryPoints, architectureNotes, packageJsonSummary };
}

export function repoMapSummary(map: RepoMap): string {
  const lines = [
    `Root files: ${map.rootFiles.slice(0, 15).join(", ") || "—"}`,
    `Routes (${map.routes.length}): ${map.routes.slice(0, 12).join(", ") || "—"}`,
    `Configs: ${map.configs.join(", ") || "—"}`,
    `Entries: ${map.entryPoints.join(", ") || "—"}`,
    map.architectureNotes.length ? `Architecture: ${map.architectureNotes.join("; ")}` : "",
  ];
  if (map.packageJsonSummary) {
    lines.push(
      `package: ${map.packageJsonSummary.name ?? "?"} scripts=[${map.packageJsonSummary.scripts.slice(0, 8).join(",")}] deps=${map.packageJsonSummary.dependencies.length} devDeps=${map.packageJsonSummary.devDependencies.length}`,
    );
  }
  return lines.filter(Boolean).join("\n");
}
