import type { SkillRecord } from "./skill-registry";
export type SkillRetrievalRequest={goal:string;capability?:string;limit?:number};
export type SkillMatch={skill:SkillRecord;score:number;reasons:string[]};
function tokens(v:string){return v.toLowerCase().split(/[^a-z0-9ก-๙]+/).filter(Boolean)}
export function retrieveSkills(skills:SkillRecord[],request:SkillRetrievalRequest):SkillMatch[]{
 const goal=new Set(tokens(request.goal)),limit=Math.max(1,Math.min(request.limit??5,10));
 return skills.filter(s=>s.state==="verified").filter(s=>!request.capability||s.capabilities.includes(request.capability)).map(skill=>{
  const hay=tokens([skill.name,skill.description,...skill.capabilities].join(" ")),overlap=hay.filter(t=>goal.has(t)).length,verification=skill.verificationCount??0;
  return {skill,score:overlap*10+Math.min(verification,10),reasons:[overlap?"goal-token-overlap:"+overlap:"",verification?"verified:"+verification:""].filter(Boolean)}
 }).filter(m=>m.score>0).sort((a,b)=>b.score-a.score).slice(0,limit)
}