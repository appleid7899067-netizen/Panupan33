# Architecture — Panupan33 AI Coworker (Puter-first)

**Product goal:** Grok Bot–style AI coworker that finishes real work — not chat drafts.  
**Brain:** Puter Model Gateway (user token → server Puter → OpenRouter fallback).  
**Repo rule:** Everything lives in **Panupan33**. No parallel product repo. Extend existing Boss engine.

**Honesty rule:** Capability registry may list every target. Status stays `planned` / `partial` until real code + evidence exist. Never mark `implemented` for scoreboard vanity.

---

## Pipeline (single spine)

```
User
  ↓
Panupan33 Chat  (primary control surface)
  ↓
Boss Planner    (boss-planner / agent-kernel)
  ↓
Puter Model     (model-gateway.server · callWithFallback)
  ↓
Agent / Specialist  (core-skill-router · grok-skills · lanes)
  ↓
Tool Router     (boss-tool-router · puter-tool-loader)
  ├─ GitHub
  ├─ Browser
  ├─ Cloud Computer / Sandbox
  ├─ MCP
  ├─ Web
  ├─ Files
  └─ APIs
  ↓
Observe         (tool results · activity steps)
  ↓
Evidence        (boss-evidence)
  ↓
Verify          (evidence gate · auto-verify publish · CI)
  ↓
Recovery        (boss-recovery · self-critique)  ← if broken
  ↓
Artifact / Result  (code, files, reports, PR, preview URL)
```

Maps 1:1 to existing `runAgentLoop` phases: **plan → select → act → observe → refine → verify**.

---

## Capability pillars (targets, not claims)

| Pillar | Intent | Code anchors (existing) | Status policy |
|--------|--------|-------------------------|---------------|
| 🧠 Puter Model Gateway | Brain for every turn | `model-gateway.server`, `puter-tool-loader` | **implemented** path exists |
| 🤖 Persistent Bot | Identity/context per task | `boss-task-state`, Puter KV resume | **partial** |
| 🖥️ Cloud Runtime | Web/shell when needed | `sandbox-runtime`, background sandbox | **partial** |
| 🔧 Tools | GitHub, Web, Browser, Files, APIs, MCP | tool loader + routers | **partial** (set grows) |
| 🔐 Connector/Login | Safe credentials | auth stack; portal login | **planned** for third-party portals |
| 🧑‍🏫 Teach Once → Routine | Show once, rerun | skill-learning, skill-memory | **planned** product surface |
| 👥 Specialist Lanes | Domain agents | core-skill-router, grok-skills | **partial** |
| 🤝 Handoff / Parallel | Multi-bot | orchestrator | **planned** full parallel |
| ⏸️ Approve Gate | Stop on risky acts | verification gate; explicit UI | **partial** engine / **planned** UX |
| 🧠 Memory | Task / context / routine | agent memory, KV | **partial** |
| 📦 Artifacts | Code, files, PR, reports | publisher, GitHub driver | **partial** |
| 🔍 Evidence + Verify | Prove work happened | boss-evidence, auto-verify | **partial→implemented** core |
| 🔄 Recovery / Critique | Diagnose + fix | boss-recovery, agent-loop | **partial** |
| 📱 Mobile / PWA | Control from phone | responsive chat | **partial** |
| 🔔 Notifications / Shared thread | Cross-device + alerts | thread history | **planned** push |
| 📊 Packaged jobs | Inbox, invoice, expense, bug repro, intel | — | **planned** (except bug repro partial) |

Full machine-readable list: `GET /api/capabilities` · `src/lib/boss-engine/capabilities.ts` · `docs/GROK_BOT_PARITY.md`.

---

## Rules

1. **Chat is the commander** — user states the goal; Boss picks the path.
2. **Puter is the default brain** — never hardcode a single paid API as primary.
3. **Every action is observable** — steps/activity, not silent magic.
4. **No success without evidence** — verify before “เสร็จแล้ว”.
5. **Providers behind adapters** — UI never owns model/tool credentials.
6. **Extend, don’t fork** — new coworker features land in `src/lib/boss-engine/*` and existing chat routes.
7. **Registry honesty** — names are goals; status tracks reality.

---

## Implementation order (no duplication)

1. Harden Puter gateway + evidence gate (already strongest).  
2. Approve Gate UX on risky tools (mutate/deploy/send).  
3. Specialist lanes via skill router (Grok skills already registered).  
4. Task memory ↔ routine store (teach-once).  
5. Cloud computer continuity (background jobs on Render).  
6. Connector vault (only after security model).  
7. Packaged workflows (inbox/invoice/…) as skill packs on top of tools.  
8. PWA + notifications last-mile.

Live: https://panupanboss.onrender.com/  
Repo: https://github.com/appleid7899067-netizen/Panupan33
