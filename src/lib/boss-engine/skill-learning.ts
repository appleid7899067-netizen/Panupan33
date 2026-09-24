import type { SkillRecord, SkillState } from "./skill-registry";
export type SkillLearningEvent={type:"execution";skillId:string;success:boolean;evidence?:string;error?:string}|{type:"feedback";skillId:string;feedback:string}|{type:"teach";name:string;description:string;capabilities:string[];instructions:string[]};
export type SkillCandidate={skill:SkillRecord;source:"teaching"|"execution-feedback";basedOn?:string;proposedChanges:string[]};
export type SkillPromotionDecision={allowed:boolean;reason:string;nextState:SkillState};
export function learnFromExecution(skill:SkillRecord,event:Extract<SkillLearningEvent,{type:"execution"}>):SkillCandidate|null{
 if(event.success)return null;
 return {skill:{...skill,state:"draft",version:bumpVersion(skill.version)},source:"execution-feedback",basedOn:skill.id,proposedChanges:[event.error?"avoid:"+event.error:"add failure handling","require verification evidence"]}
}
export function createTaughtSkill(event:Extract<SkillLearningEvent,{type:"teach"}>):SkillCandidate{
 const id="user.learned."+event.name.toLowerCase().replace(/[^a-z0-9]+/g,"-");
 return {skill:{id,name:event.name,description:event.description,origin:"user",capabilities:event.capabilities,version:"0.1.0",state:"draft",verificationCount:0},source:"teaching",proposedChanges:event.instructions.map(i=>"step:"+i)}
}
export function evaluateSkillPromotion(candidate:SkillCandidate,e:{tested:boolean;verified:boolean;evidence?:string}):SkillPromotionDecision{
 if(!e.tested)return{allowed:false,reason:"Skill must be tested before promotion.",nextState:"draft"};
 if(!e.verified)return{allowed:false,reason:"Skill needs verification evidence before activation.",nextState:"draft"};
 if(!e.evidence?.trim())return{allowed:false,reason:"Verification evidence is required.",nextState:"draft"};
 return{allowed:true,reason:"Test and verification evidence are present.",nextState:"verified"}
}
function bumpVersion(v:string){const m=v.match(/^(\d+)\.(\d+)\.(\d+)$/);return m?m[1]+"."+m[2]+"."+(Number(m[3])+1):"0.1.0"}
