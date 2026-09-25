/**
 * Panupan33 AI Coworker pipeline — Puter-first spine.
 *
 * This is the structural contract for “Grok Bot-style coworker” inside
 * the existing Boss engine. It does NOT invent a second product.
 *
 * Stages mirror runAgentLoop: plan → select → act → observe → refine → verify
 * and document which modules own each stage.
 *
 * Status of product pillars stays in capabilities.ts (honest planned/partial).
 */

export type CoworkerStageId =
  | "chat"
  | "planner"
  | "puter_model"
  | "specialist"
  | "tool_router"
  | "observe"
  | "evidence"
  | "verify"
  | "recovery"
  | "artifact";

export type CoworkerStage = {
  id: CoworkerStageId;
  name: string;
  /** Existing modules that implement this stage today */
  modules: string[];
  /** What the stage must produce */
  produces: string;
};

/** Canonical spine — User → … → Artifact */
export const COWORKER_PIPELINE: readonly CoworkerStage[] = [
  {
    id: "chat",
    name: "Panupan33 Chat",
    modules: ["src/routes/chat.tsx", "src/routes/index.tsx", "src/lib/catalog.ts"],
    produces: "user goal + thread id",
  },
  {
    id: "planner",
    name: "Boss Planner",
    modules: [
      "src/lib/boss-engine/boss-planner.ts",
      "src/lib/boss-engine/agent-kernel.ts",
      "src/lib/boss-engine/agent-foundation.ts",
    ],
    produces: "goal contract + budget + route intent",
  },
  {
    id: "puter_model",
    name: "Puter Model Gateway",
    modules: [
      "src/lib/model-gateway.server.ts",
      "src/lib/puter-tool-loader.ts",
    ],
    produces: "model completion + tool calls (user token → server Puter → OpenRouter)",
  },
  {
    id: "specialist",
    name: "Agent / Specialist",
    modules: [
      "src/lib/boss-engine/core-skill-router.ts",
      "src/lib/boss-engine/grok-skills.ts",
      "src/lib/boss-engine/core-skills.ts",
    ],
    produces: "skill set for intent (coder/researcher/game/ui/…)",
  },
  {
    id: "tool_router",
    name: "Tool Router",
    modules: [
      "src/lib/boss-engine/boss-tool-router.ts",
      "src/lib/puter-tool-loader.ts",
    ],
    produces: "GitHub | Browser | Sandbox | MCP | Web | Files | APIs",
  },
  {
    id: "observe",
    name: "Observe",
    modules: ["src/lib/agent-loop.ts"],
    produces: "tool results + activity steps",
  },
  {
    id: "evidence",
    name: "Evidence",
    modules: ["src/lib/boss-engine/boss-evidence.ts"],
    produces: "ingested evidence records",
  },
  {
    id: "verify",
    name: "Verify",
    modules: [
      "src/lib/agent-loop.ts",
      "src/lib/boss-engine/publisher-runner.ts",
      "src/lib/boss-engine/github-loop-driver.ts",
    ],
    produces: "verified flag | HTTP check | CI status",
  },
  {
    id: "recovery",
    name: "Recovery / Self-Critique",
    modules: [
      "src/lib/boss-engine/boss-recovery.ts",
      "src/lib/agent-loop.ts",
    ],
    produces: "alternate strategy or failure report",
  },
  {
    id: "artifact",
    name: "Artifact / Result",
    modules: [
      "src/lib/boss-engine/publisher.ts",
      "src/lib/boss-engine/github-loop-driver.ts",
      "src/lib/boss-engine/boss-task-state.ts",
    ],
    produces: "code, files, PR, preview URL, report",
  },
] as const;

export type ToolLane =
  | "github"
  | "browser"
  | "cloud_computer"
  | "mcp"
  | "web"
  | "files"
  | "apis";

export const TOOL_LANES: Record<ToolLane, { label: string; match: RegExp }> = {
  github: { label: "GitHub", match: /github_/i },
  browser: { label: "Browser", match: /browser|playwright|puppeteer/i },
  cloud_computer: { label: "Cloud Computer / Sandbox", match: /sandbox|terminal|programming_lab/i },
  mcp: { label: "MCP", match: /mcp/i },
  web: { label: "Web", match: /web_search|web_browse|web_check|web_fetch/i },
  files: { label: "Files", match: /file_|fs_|read_file|write_file|builder_/i },
  apis: { label: "APIs", match: /api_|http_|fetch_/i },
};

export function classifyToolLane(toolName: string): ToolLane | null {
  for (const [lane, meta] of Object.entries(TOOL_LANES) as [ToolLane, { match: RegExp }][]) {
    if (meta.match.test(toolName)) return lane;
  }
  return null;
}

/** One-line spine for system prompts / activity headers */
export function coworkerPipelineSummary(): string {
  return COWORKER_PIPELINE.map((s) => s.name).join(" → ");
}

export const PUTER_FIRST_RULE =
  "Puter is the primary model brain: user Puter token → server PUTER_AUTH_TOKEN → OpenRouter fallback. " +
  "Boss owns planning, tools, evidence, and verification — the model never silently claims success without tool evidence.";
