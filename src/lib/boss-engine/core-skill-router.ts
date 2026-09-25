import { CORE_SKILLS } from "./core-skills";
import { matchGrokSkills } from "./grok-skills";
import type { SkillRecord } from "./skill-registry";

export type CoreSkillRouteIntent =
  | "chat"
  | "research"
  | "code"
  | "github"
  | "deploy"
  | "verify"
  | "data"
  | "game"
  | "ui"
  | "general";

const INTENT_SKILLS: Record<CoreSkillRouteIntent, string[]> = {
  chat: ["core.memory-context"],
  research: [
    "core.web-search-scraping",
    "core.data-parsing-formatting",
    "core.memory-context",
  ],
  code: [
    "core.code-execution-math",
    "core.data-parsing-formatting",
    "core.memory-context",
    "grok.design-ui",
  ],
  github: [
    "core.code-execution-math",
    "core.data-parsing-formatting",
    "core.memory-context",
  ],
  deploy: ["core.api-calling", "core.code-execution-math", "core.memory-context"],
  verify: [
    "core.code-execution-math",
    "core.api-calling",
    "core.data-parsing-formatting",
    "core.memory-context",
  ],
  data: [
    "core.data-parsing-formatting",
    "core.code-execution-math",
    "core.memory-context",
    "grok.neon",
  ],
  game: [
    "grok.building-games",
    "grok.controls",
    "grok.design-ui",
    "core.code-execution-math",
    "core.memory-context",
  ],
  ui: ["grok.design-ui", "core.memory-context"],
  general: [
    "core.memory-context",
    "core.data-parsing-formatting",
    "core.api-calling",
  ],
};

export function routeCoreSkills(
  intent: CoreSkillRouteIntent,
  extraSkills: SkillRecord[] = [],
  userText = "",
): SkillRecord[] {
  const byId = new Map(
    [...CORE_SKILLS, ...extraSkills].map((skill) => [skill.id, skill]),
  );
  const ids = new Set(INTENT_SKILLS[intent] ?? INTENT_SKILLS.general);

  // Always layer trigger-matched Grok skills so ZIP skills are actually used
  for (const meta of matchGrokSkills(userText)) {
    ids.add(meta.id);
  }

  return [...ids]
    .map((id) => byId.get(id))
    .filter((skill): skill is SkillRecord => Boolean(skill));
}

export function coreSkillSummary(
  intent: CoreSkillRouteIntent,
  userText = "",
): string {
  return routeCoreSkills(intent, [], userText)
    .map((skill) => skill.name)
    .join(", ");
}
