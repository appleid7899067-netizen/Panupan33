import type { SkillRecord } from "./skill-registry";
import { DATA_PARSING_FORMATTING_SKILL } from "./skills/core/data-parsing-formatting/skill";
import { WEB_SEARCH_SCRAPING_SKILL } from "./skills/core/web-search-scraping/skill";
import { CODE_EXECUTION_MATH_SKILL } from "./skills/core/code-execution-math/skill";
import { API_CALLING_SKILL } from "./skills/core/api-calling/skill";
import { MEMORY_CONTEXT_SKILL } from "./skills/core/memory-context/skill";

export const CORE_SKILLS: readonly SkillRecord[] = [
  DATA_PARSING_FORMATTING_SKILL,
  WEB_SEARCH_SCRAPING_SKILL,
  CODE_EXECUTION_MATH_SKILL,
  API_CALLING_SKILL,
  MEMORY_CONTEXT_SKILL,
];

export function getCoreSkills(): SkillRecord[] {
  return CORE_SKILLS.map((skill) => ({
    ...skill,
    capabilities: [...skill.capabilities],
    verification: skill.verification ? { ...skill.verification } : undefined,
  }));
}
