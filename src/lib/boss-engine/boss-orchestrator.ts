/**
 * Boss Orchestrator — wires Phase 1 engine into a single run context.
 */

import {
  createPlan,
  markStepDone,
  markStepFailed,
  markStepRunning,
  nextRunnableStep,
  planSummary,
  resumePlan,
  type ExecutionPlan,
} from "./boss-planner";
import {
  createTaskState,
  recordError,
  recordTest,
  resumeSummary,
  type TaskState,
} from "./boss-task-state";
import { createEvidenceEngine, type EvidenceEngine } from "./boss-evidence";
import { createRecoveryEngine, type RecoveryEngine } from "./boss-recovery";
import { routeToolsForTask, routerDecisionSummary, type RouterDecision } from "./boss-tool-router";
import type { CodingFleetTool } from "@/lib/puter-tool-loader";
import { ADAPTIVE_DATA_EXTRACTION_PROMPT, isDataExtractionTask } from "@/lib/adaptive-data-extraction";

export type BossContext = {
  plan: ExecutionPlan;
  task: TaskState;
  evidence: EvidenceEngine;
  recovery: RecoveryEngine;
  router: RouterDecision;
};

export async function bootstrapBoss(goal: string, threadId?: string): Promise<BossContext> {
  const plan = createPlan(goal);
  const task = createTaskState(goal, threadId, plan);
  const evidence = createEvidenceEngine();
  const recovery = createRecoveryEngine();
  const router = await routeToolsForTask(goal);
  return { plan, task, evidence, recovery, router };
}

export function bossPromptPrefix(ctx: BossContext): string {
  const step = nextRunnableStep(ctx.plan);
  const recovery = ctx.recovery.decide();
  const gate = ctx.evidence.evaluate({
    mutationExpected: /แก้|เขียน|สร้าง|fix|deploy|commit/i.test(ctx.task.goal),
    verificationRequested: /test|verify|ตรวจ|build|ci/i.test(ctx.task.goal),
    deployRequested: /deploy|ดีพลอย|publish|host/i.test(ctx.task.goal),
    previewRequested: /preview|ดูผล|เปิดเว็บ/i.test(ctx.task.goal),
  });

  return [
    "=== BOSS ENGINE (Phase 1) ===",
    "=== TRUTH / REAL-WORK CONTRACT ===",
    "1. ห้ามโกหก ห้ามเดา ห้ามอ้างว่าทำแล้วถ้ายังไม่ได้ทำจริง",
    "2. ห้ามอ้างว่าแก้ไฟล์ commit deploy test search หรือเปิดเว็บสำเร็จ หากไม่มีผลลัพธ์จาก tool จริง",
    "3. success/done/verified ใช้ได้ต่อเมื่อมี evidence ที่ตรวจสอบย้อนกลับได้เท่านั้น",
    "4. ถ้า tool ไม่พร้อม สิทธิ์ไม่พอ timeout error หรือยังไม่ได้ตรวจ ให้บอกสถานะจริง",
    "5. ห้ามสร้างหลักฐานปลอม เช่น URL commit SHA test result HTTP status หรือไฟล์",
    "6. ถ้าทำไม่สำเร็จ ให้รายงานสิ่งที่ทำแล้ว สิ่งที่ทำไม่ได้ error จริง และขั้นตอนถัดไป",
    "7. งานแก้โค้ดหรือ deploy ต้องมี verification จริงก่อนตอบว่าสำเร็จ",
    "8. คำตอบจากโมเดลไม่ใช่หลักฐาน หลักฐานต้องมาจาก tool runtime CI หรือ HTTP จริง",
    "=== END TRUTH / REAL-WORK CONTRACT ===",
    ...(isDataExtractionTask(ctx.task.goal) ? [ADAPTIVE_DATA_EXTRACTION_PROMPT] : []),
    planSummary(ctx.plan),
    "",
    `Current step: ${step ? `${step.title} (needs: ${step.needs.join(", ") || "none"})` : "none — plan complete or blocked"}`,
    routerDecisionSummary(ctx.router),
    "",
    "Evidence:",
    ctx.evidence.summary(),
    gate.sufficient ? "Evidence gate: SUFFICIENT" : `Evidence gate: NOT YET — ${gate.reason}`,
    "",
    recovery.instruction ? recovery.instruction : "Recovery: idle",
    "",
    "Task memory:",
    resumeSummary(ctx.task),
    "=== END BOSS ENGINE ===",
  ].join("\n");
}

export function onToolResults(
  ctx: BossContext,
  results: Array<{ name: string; ok: boolean; result?: unknown; error?: unknown }>,
): BossContext {
  let plan = ctx.plan;
  let task = ctx.task;
  const step = nextRunnableStep(plan);

  for (const r of results) {
    ctx.evidence.ingestToolResult(r.name, r.ok, r.result);
    if (r.ok) {
      ctx.recovery.markResolved(r.name);
      task = recordTest(task, r.name, true, String(r.result ?? "ok").slice(0, 500));
    } else {
      const err = String(r.error ?? r.result ?? "failed");
      ctx.recovery.recordFailure(r.name, err);
      task = recordError(task, r.name, err);
      if (step) plan = markStepFailed(plan, step.id, err);
    }
  }

  if (step && results.some((r) => r.ok) && !results.some((r) => !r.ok)) {
    plan = markStepRunning(plan, step.id);
    plan = markStepDone(plan, step.id, ctx.evidence.summary());
  }

  return { ...ctx, plan, task };
}

export function shouldStopAsVerified(ctx: BossContext): boolean {
  const gate = ctx.evidence.evaluate({
    mutationExpected: /แก้|เขียน|สร้าง|fix|deploy|commit/i.test(ctx.task.goal),
    verificationRequested: /test|verify|ตรวจ|build|ci/i.test(ctx.task.goal),
    deployRequested: /deploy|ดีพลอย|publish|host/i.test(ctx.task.goal),
    previewRequested: /preview|ดูผล|เปิดเว็บ/i.test(ctx.task.goal),
  });
  return gate.sufficient && (ctx.plan.status === "completed" || !nextRunnableStep(ctx.plan));
}

export function selectToolsFromRouter(ctx: BossContext): CodingFleetTool[] {
  return ctx.router.selected as CodingFleetTool[];
}

export function resumeBoss(ctx: BossContext): BossContext {
  return { ...ctx, plan: resumePlan(ctx.plan) };
}
