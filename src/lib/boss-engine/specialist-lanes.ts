import { matchGrokSkills } from "./grok-skills";

export type SpecialistLane = "coder" | "game" | "ui" | "github" | "research" | "deploy" | "data" | "general";
export type SpecialistDecision = { lane: SpecialistLane; skills: string[] };

export function selectSpecialistLane(text: string): SpecialistDecision {
  const t = text.toLowerCase();
  const lane: SpecialistLane =
    /github|repo|repository|pull request|\bpr\b|branch|commit|actions|workflow/.test(t) ? "github" :
    /game|เกม|phaser|threejs|platformer|fps|racing/.test(t) ? "game" :
    /ui|design|หน้าตา|ดีไซน์|landing|frontend|css/.test(t) ? "ui" :
    /deploy|ดีพลอย|render|vercel|netlify|publish/.test(t) ? "deploy" :
    /search|research|ค้นหา|ข้อมูล/.test(t) ? "research" :
    /database|postgres|sql|ฐานข้อมูล/.test(t) ? "data" :
    /code|โค้ด|fix|bug|debug|แก้|typescript|react/.test(t) ? "coder" : "general";
  return { lane, skills: matchGrokSkills(text).map((s) => s.id) };
}
