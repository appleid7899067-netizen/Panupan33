/**
 * Specialist Lanes — domain agents composed from core + Grok skills.
 */

import { routeCoreSkills, type CoreSkillRouteIntent } from "./core-skill-router";
import { matchGrokSkills, grokSkillsPromptBlock } from "./grok-skills";
import type { SkillRecord } from "./skill-registry";

export type SpecialistLane =
  | "commander"
  | "coder"
  | "researcher"
  | "data"
  | "game"
  | "ui"
  | "deploy"
  | "github"
  | "ops";

const LANE_INTENT: Record<SpecialistLane, CoreSkillRouteIntent> = {
  commander: "general",
  coder: "code",
  researcher: "research",
  data: "data",
  game: "game",
  ui: "ui",
  deploy: "deploy",
  github: "github",
  ops: "verify",
};

export function detectLane(userText: string): SpecialistLane {
  const t = userText.toLowerCase();
  if (/เกม|game|phaser|platformer|fps|wasd|sprite|tilemap/.test(t)) return "game";
  if (/ui|landing|design|หน้าตา|ดีไซน์|polish|theme/.test(t)) return "ui";
  if (/github|pr\b|pull request|commit|branch|ci\b/.test(t)) return "github";
  if (/deploy|publish|hosting|ดีพลอย|vercel|render/.test(t)) return "deploy";
  if (/database|sql|postgres|neon|data|csv|วิเคราะห์/.test(t)) return "data";
  if (/search|ค้น|ข่าว|research|web |หาข้อมูล/.test(t)) return "researcher";
  if (/code|โค้ด|bug|debug|refactor|typescript|function/.test(t)) return "coder";
  if (/inbox|invoice|expense|ops|routine/.test(t)) return "ops";
  return "commander";
}

export type SpecialistBundle = {
  lane: SpecialistLane;
  skills: SkillRecord[];
  skillPrompt: string;
  label: string;
};

export function buildSpecialistBundle(userText: string): SpecialistBundle {
  const lane = detectLane(userText);
  const intent = LANE_INTENT[lane];
  const skills = routeCoreSkills(intent, [], userText);
  const matched = matchGrokSkills(userText);
  const skillPrompt = grokSkillsPromptBlock(matched);
  return {
    lane,
    skills,
    skillPrompt,
    label: `Specialist:${lane} · skills=${skills.map((s) => s.name).join(",") || "none"}`,
  };
}
