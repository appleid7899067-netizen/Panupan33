export type SkillId = "code" | "research" | "deploy" | "data" | "conversation";

export const SKILLS: Record<SkillId, { id: SkillId; name: string }> = {
  code: { id: "code", name: "Code" },
  research: { id: "research", name: "Research" },
  deploy: { id: "deploy", name: "Browser/Deploy" },
  data: { id: "data", name: "Data" },
  conversation: { id: "conversation", name: "Conversation" },
};
