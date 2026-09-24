import { CORE_SKILLS } from "./core-skills";
import type { SkillRecord } from "./skill-registry";

export type CoreSkillRouteIntent = "chat" | "research" | "code" | "github" | "deploy" | "verify" | "data" | "general";

const INTENT_SKILLS: Record<CoreSkillRouteIntent, string[]> = {
  chat: ["core.memory-context"],
  research: ["core.web-search-scraping", "core.data-parsing-formatting", "core.memory-context"],
  code: ["core.code-execution-math", "core.data-parsing-formatting", "core.memory-context"],
  github: ["core.code-execution-math", "core.data-parsing-formatting", "core.memory-context"],
  deploy: ["core.api-calling", "core.code-execution-math", "core.memory-context"],
  verify: ["core.code-execution-math", "core.api-calling", "core.data-parsing-formatting", "core.memory-context"],
  data: ["core.data-parsing-formatting", "core.code-execution-math", "core.memory-context"],
  general: ["core.memory-context", "core.data-parsing-formatting", "core.api-calling"],
};

export function routeCoreSkills(intent: CoreSkillRouteIntent, extraSkills: SkillRecord[] = []): SkillRecord[] {
  const byId = new Map([...CORE_SKILLS, ...extraSkills].map((skill) => [skill.id, skill]));
  const ids = INTENT_SKILLS[intent] ?? INTENT_SKILLS.general;
  return ids.map((id) => byId.get(id)).filter((skill): skill is SkillRecord => Boolean(skill));
}

export function coreSkillSummary(intent: CoreSkillRouteIntent): string {
  return routeCoreSkills(intent).map((skill) => skill.name).join(", ");
}
