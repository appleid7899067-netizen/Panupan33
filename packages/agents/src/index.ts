export type AgentId =
  | "planner"
  | "builder"
  | "researcher"
  | "operator"
  | "reviewer"
  | "verifier";

export const AGENTS: Record<AgentId, { id: AgentId; name: string; purpose: string }> = {
  planner: { id: "planner", name: "Planner", purpose: "decompose goals into executable steps" },
  builder: { id: "builder", name: "Builder", purpose: "implement code and configuration" },
  researcher: { id: "researcher", name: "Researcher", purpose: "find and synthesize relevant evidence" },
  operator: { id: "operator", name: "Operator", purpose: "execute permitted tools and deployments" },
  reviewer: { id: "reviewer", name: "Reviewer", purpose: "inspect changes, tests, and failures" },
  verifier: { id: "verifier", name: "Verifier", purpose: "prove the requested outcome exists" },
};
