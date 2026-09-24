import { normalizeSkill, activateVerifiedSkill, type SkillRecord } from "../skill-registry";

export const RESILIENT_DATA_INGESTION_SKILL: SkillRecord = activateVerifiedSkill(
  normalizeSkill({
    id: "core.resilient-data-ingestion",
    name: "Resilient Data Ingestion",
    description: "Fetch raw data safely, survive transient failures, validate and quarantine partial data, and verify ingestion.",
    origin: "core",
    capabilities: ["research", "search", "data", "verify", "sandbox"],
    version: "1.0.0",
  }),
  true,
);

export { retryDecision, type RetryDecision } from "./retry";
export { CircuitBreaker, type CircuitSnapshot, type CircuitState } from "./circuit-breaker";
export { validateRecord, anomalyCheck, type ValidationResult } from "./validate";
export { contentHash, dedupeUrls } from "./dedup";
export { quarantine, type QuarantineRecord } from "./quarantine";
export { createSnapshot, type Snapshot } from "./snapshot";
