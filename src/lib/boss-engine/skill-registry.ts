/**
 * Bossnu Skill Registry
 *
 * Core skills are shipped by the repository.
 * User skills are additive and never trusted merely because they were uploaded.
 * A skill becomes active only after its contract is valid and verification
 * records show that it passed its required checks.
 */

export type SkillOrigin = "core" | "user" | "imported";
export type SkillState = "draft" | "verified" | "disabled";

export type SkillRecord = {
  id: string;
  name: string;
  description: string;
  origin: SkillOrigin;
  state: SkillState;
  capabilities: string[];
  version: string;
  verification?: {
    passed: number;
    failed: number;
    lastVerifiedAt?: string;
  };
};

export type SkillCandidate = {
  id: string;
  name: string;
  description: string;
  origin: SkillOrigin;
  capabilities: string[];
  version?: string;
};

export function normalizeSkill(candidate: SkillCandidate): SkillRecord {
  return {
    id: candidate.id.trim(),
    name: candidate.name.trim(),
    description: candidate.description.trim(),
    origin: candidate.origin,
    state: "draft",
    capabilities: [...new Set(candidate.capabilities.map((x) => x.trim().toLowerCase()).filter(Boolean))],
    version: candidate.version?.trim() || "0.1.0",
    verification: { passed: 0, failed: 0 },
  };
}

export function activateVerifiedSkill(skill: SkillRecord, passed: boolean, at = new Date().toISOString()): SkillRecord {
  const verification = skill.verification ?? { passed: 0, failed: 0 };
  const next = {
    ...skill,
    verification: {
      passed: verification.passed + (passed ? 1 : 0),
      failed: verification.failed + (passed ? 0 : 1),
      lastVerifiedAt: at,
    },
  };

  return passed
    ? { ...next, state: "verified" }
    : { ...next, state: "draft" };
}

export function findApplicableSkills(skills: SkillRecord[], capability: string): SkillRecord[] {
  const key = capability.trim().toLowerCase();
  return skills
    .filter((skill) => skill.state === "verified" && skill.capabilities.includes(key))
    .sort((a, b) => (b.verification?.passed ?? 0) - (a.verification?.passed ?? 0));
}
