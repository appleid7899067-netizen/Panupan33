/**
 * Boss Arena
 * A/B decision loop for Boss Engine.
 *
 * Arena is deliberately model-agnostic: it does not decide which option is
 * better. It records the user's choice and turns that choice into explicit
 * context for the next Planner/Agent run.
 */

export type ArenaOption = {
  id: "A" | "B";
  title: string;
  instruction: string;
};

export type ArenaSession = {
  id: string;
  goal: string;
  options: [ArenaOption, ArenaOption];
  createdAt: number;
};

export type ArenaChoice = {
  sessionId: string;
  optionId: "A" | "B";
  reason?: string;
  createdAt: number;
};

export function createArenaSession(goal: string, optionA?: Partial<ArenaOption>, optionB?: Partial<ArenaOption>): ArenaSession {
  const cleanGoal = goal.trim();
  const id = `arena_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    goal: cleanGoal,
    options: [
      {
        id: "A",
        title: optionA?.title ?? "แนวทาง A",
        instruction: optionA?.instruction ?? `พัฒนาเป้าหมายนี้โดยเน้นความเรียบง่าย เสถียรภาพ และการเปลี่ยนแปลงให้น้อยที่สุด: ${cleanGoal}`,
      },
      {
        id: "B",
        title: optionB?.title ?? "แนวทาง B",
        instruction: optionB?.instruction ?? `พัฒนาเป้าหมายนี้โดยเปิดทางให้ UX/ความสามารถขยายต่อได้ พร้อมรักษา Verification: ${cleanGoal}`,
      },
    ],
    createdAt: Date.now(),
  };
}

export function createArenaChoiceContext(choice: ArenaChoice, session: ArenaSession): string {
  const selected = session.options.find((option) => option.id === choice.optionId);
  if (!selected) return "";
  return [
    "BOSS ARENA FEEDBACK",
    `session=${session.id}`,
    `user_selected=${selected.id}`,
    `selected_direction=${selected.title}`,
    `instruction=${selected.instruction}`,
    choice.reason ? `reason=${choice.reason.trim()}` : "",
    "Treat this as user preference/context, not proof that the selected implementation is correct.",
    "Continue with normal Planner → Tool → Observe → Evidence → Verify flow.",
  ].filter(Boolean).join("\n");
}

/**
 * Stable preference key for callers that want to persist Arena feedback in
 * Puter KV, a database, or another memory adapter.
 */
export function arenaPreferenceKey(optionId: "A" | "B"): string {
  return `boss.arena.preference.${optionId}`;
}
