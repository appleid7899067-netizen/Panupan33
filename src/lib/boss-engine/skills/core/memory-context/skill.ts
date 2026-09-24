import { activateVerifiedSkill, normalizeSkill, type SkillRecord } from "../../../skill-registry";

export type MemoryContextRequest = {
  goal: string;
  recentContext?: string;
  memoryQuery?: string;
  taskId?: string;
};

export const MEMORY_CONTEXT_SKILL: SkillRecord = activateVerifiedSkill(
  normalizeSkill({
    id: "core.memory-context",
    name: "Memory & Context Management",
    description: "Compress relevant context, retrieve prior task memory and preserve resumable task state without treating memory as proof.",
    origin: "core",
    capabilities: ["memory", "verify"],
    version: "1.0.0",
  }),
  true,
);

export function describeMemoryContext(request: MemoryContextRequest) {
  return {
    skill: MEMORY_CONTEXT_SKILL.id,
    query: request.memoryQuery ?? request.goal,
    taskId: request.taskId,
    recentContext: request.recentContext ?? "",
    memoryIsEvidence: false,
    liveVerificationWins: true,
  };
}
