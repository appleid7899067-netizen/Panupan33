# Boss Engine (Phase 1)

Core autonomous engine modules:

1. **boss-planner.ts** — Autonomous Planner (goal → execution graph, deps, resume)
2. **boss-task-state.ts** — Agent State / Task Memory (goal, files, errors, tests, preview/deploy)
3. **boss-evidence.ts** — Evidence Engine (sufficient evidence gate, no duplicate checks)
4. **boss-recovery.ts** — Recovery Loop (diagnose → strategy → fix → verify, loop detection)
5. **boss-tool-router.ts** — Smart Tool Router (capability needs: GitHub+Sandbox without Web etc.)

Wire into `agent-loop.ts` via:

```ts
import { createPlan, nextRunnableStep, markStepDone, planSummary } from "@/lib/boss-engine";
import { createTaskState, resumeSummary } from "@/lib/boss-engine";
import { createEvidenceEngine } from "@/lib/boss-engine";
import { createRecoveryEngine } from "@/lib/boss-engine";
import { routeToolsForTask } from "@/lib/boss-engine";
```

Status: Phase 1 modules landed. Integration into agent-loop is next.
