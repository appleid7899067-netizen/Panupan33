import { activateVerifiedSkill, normalizeSkill, type SkillRecord } from "../../../skill-registry";

export type CodeExecutionRequest = {
  language: "python" | "javascript" | "typescript" | "bash" | "node";
  code: string;
  timeoutMs?: number;
};

export const CODE_EXECUTION_MATH_SKILL: SkillRecord = activateVerifiedSkill(
  normalizeSkill({
    id: "core.code-execution-math",
    name: "Code Execution & Math",
    description: "Use bounded sandbox execution for calculations, transformations, scripts and reproducible checks.",
    origin: "core",
    capabilities: ["code", "sandbox", "verify"],
    version: "1.0.0",
  }),
  true,
);

export function describeCodeExecution(request: CodeExecutionRequest) {
  return {
    skill: CODE_EXECUTION_MATH_SKILL.id,
    language: request.language,
    timeoutMs: Math.min(Math.max(request.timeoutMs ?? 15000, 100), 60000),
    network: false,
    requiresVerification: true,
  };
}
