import { activateVerifiedSkill, normalizeSkill, type SkillRecord } from "../../../skill-registry";

export type WebResearchRequest = {
  goal: string;
  query?: string;
  url?: string;
  needsLatest?: boolean;
  needsBrowser?: boolean;
};

export const WEB_SEARCH_SCRAPING_SKILL: SkillRecord = activateVerifiedSkill(
  normalizeSkill({
    id: "core.web-search-scraping",
    name: "Web Search & Scraping",
    description: "Search current web information, open pages, extract useful content and verify source evidence.",
    origin: "core",
    capabilities: ["search", "research", "browser", "verify"],
    version: "1.0.0",
  }),
  true,
);

export function describeWebResearch(request: WebResearchRequest) {
  return {
    skill: WEB_SEARCH_SCRAPING_SKILL.id,
    query: request.query ?? request.goal,
    url: request.url,
    needsLatest: request.needsLatest ?? true,
    needsBrowser: request.needsBrowser ?? Boolean(request.url),
    requiresVerification: true,
  };
}
