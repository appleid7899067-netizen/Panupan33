import { activateVerifiedSkill, normalizeSkill, type SkillRecord } from "../../../skill-registry";

export type ApiCallRequest = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export const API_CALLING_SKILL: SkillRecord = activateVerifiedSkill(
  normalizeSkill({
    id: "core.api-calling",
    name: "API Calling",
    description: "Build and execute bounded HTTP API requests, parse responses and recover from common HTTP failures.",
    origin: "core",
    capabilities: ["api", "search", "verify"],
    version: "1.0.0",
  }),
  true,
);

export function classifyApiResponse(status: number) {
  if (status >= 200 && status < 300) return { kind: "success" as const, retry: false };
  if (status === 401 || status === 403) return { kind: "auth" as const, retry: false };
  if (status === 404) return { kind: "not-found" as const, retry: false };
  if (status === 429) return { kind: "rate-limit" as const, retry: true };
  if (status >= 500) return { kind: "server-error" as const, retry: true };
  return { kind: "client-error" as const, retry: false };
}
