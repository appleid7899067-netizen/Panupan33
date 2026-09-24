import type { SkillRecord } from "./skill-registry";
import {retrieveSkills,type SkillRetrievalRequest,type SkillMatch} from "./skill-retriever";
import {evaluateSkillPromotion,learnFromExecution,type SkillCandidate,type SkillLearningEvent,type SkillPromotionDecision} from "./skill-learning";
import {createSkillMemory,type SkillMemoryEntry} from "./skill-memory";
export type SkillLoopResult={matches:SkillMatch[];candidate?:SkillCandidate;promotion?:SkillPromotionDecision;memory:SkillMemoryEntry[]};
export function runSkillLearningLoop(skills:SkillRecord[],request:SkillRetrievalRequest,event?:SkillLearningEvent,verification?:{tested:boolean;verified:boolean;evidence?:string}):SkillLoopResult{
 const matches=retrieveSkills(skills,request),memory:SkillMemoryEntry[]=[];let candidate:SkillCandidate|undefined,promotion:SkillPromotionDecision|undefined;
 if(event?.type==="execution"){const matched=skills.find(s=>s.id===event.skillId);if(matched&&!event.success){candidate=learnFromExecution(matched,event)??undefined;memory.push(createSkillMemory("failure",event.error??"Skill execution failed",matched.id,event.evidence))}else if(matched){memory.push(createSkillMemory("experience","Skill execution succeeded",matched.id,event.evidence))}}
 if(event?.type==="teach"){candidate={skill:{id:"user.learned."+event.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),name:event.name,description:event.description,origin:"user",capabilities:event.capabilities,version:"0.1.0",state:"draft",verificationCount:0},source:"teaching",proposedChanges:event.instructions.map(i=>"step:"+i)};memory.push(createSkillMemory("discovery","New skill taught: "+event.name))}
 if(candidate&&verification)promotion=evaluateSkillPromotion(candidate,verification);
 return{matches,candidate,promotion,memory}
}
