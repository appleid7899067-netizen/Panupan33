/**
 * BossnuGrok capability registry — Panupan33
 *
 * Machine-readable contract. Status must match reality:
 * - implemented = code path + evidence exists and is used
 * - partial     = scaffolding / tools exist, not full product
 * - planned     = roadmap only
 *
 * Absorbs Grok Bot (ai.x.grok.bot) product capabilities as parity targets
 * so Boss can close the gap to "AI coworker that finishes real work".
 */

export type CapabilityStatus = "implemented" | "partial" | "planned";

export type BossCapability = {
  id: string;
  category: string;
  name: string;
  status: CapabilityStatus;
  evidence?: string;
};

const implemented = (id: string, category: string, name: string, evidence: string): BossCapability =>
  ({ id, category, name, status: "implemented", evidence });

const partial = (id: string, category: string, name: string, evidence: string): BossCapability =>
  ({ id, category, name, status: "partial", evidence });

const planned = (id: string, category: string, name: string): BossCapability =>
  ({ id, category, name, status: "planned" });

export const BOSS_CAPABILITIES: BossCapability[] = [
  // ── 1. Commander UX ──────────────────────────────────────────────
  implemented("ux.one_prompt_victory", "Commander UX", "One-Prompt Victory", "Agent kernel + autonomous plan/execute/verify loop"),
  partial("ux.command_templates", "Commander UX", "Command Templates", "Yesterday templates + SUPER1 match patterns in super-chat"),
  partial("ux.auto_file_export", "Commander UX", "Auto File Export", "Chat already supports response/code download"),
  partial("ux.voice_commander", "Commander UX", "Voice Commander", "Browser Thai speech input is wired"),
  partial("ux.mobile_commander", "Commander UX", "Mobile Commander Mode", "Responsive chat surface; PWA shell still planned"),
  partial("ux.drag_drop", "Commander UX", "Drag & Drop Anything", "Attachment flow exists; autonomous routing can be extended"),
  planned("ux.result_card", "Commander UX", "Result Card"),
  planned("ux.undo_redo", "Commander UX", "Undo / Redo Command"),
  planned("ux.share_result", "Commander UX", "Share Result Link"),
  planned("ux.onboarding", "Commander UX", "30-second Interactive Onboarding"),

  // ── 2. AI Kernel & Model ─────────────────────────────────────────
  implemented("ai.puter_primary", "AI Kernel & Model", "Puter Primary Gateway", "Server gateway routes to Puter before OpenRouter"),
  implemented("ai.multi_model_fallback", "AI Kernel & Model", "Multi-Model Fallback", "Puter model pool + OpenRouter last-resort fallback"),
  implemented("ai.context_kernel", "AI Kernel & Model", "Execution Context Kernel", "Goal contract, observations, failures and verification gate"),
  implemented("ai.self_correction", "AI Kernel & Model", "Self-Correction Loop", "Failure-aware recovery hints and repeated-action prevention"),
  planned("ai.cost_meter", "AI Kernel & Model", "Live Cost Meter"),
  planned("ai.prompt_cache", "AI Kernel & Model", "Prompt Caching"),
  partial("ai.parallel_agents", "AI Kernel & Model", "Parallel Agents", "Boss orchestrator + multi-skill route; full parallel workers planned"),
  partial("ai.user_pays", "AI Kernel & Model", "Puter User-Pays Visibility", "Puter is configured as the primary user/server gateway"),
  partial("ai.vision", "AI Kernel & Model", "Vision Routing", "Live Puter catalog is available to the client"),
  implemented("ai.thai_first", "AI Kernel & Model", "Thai-First Commander", "Intent and recovery rules recognize Thai commands"),

  // ── 3. Agents & Skills ───────────────────────────────────────────
  planned("agents.marketplace", "Agents & Skills", "Agent Marketplace"),
  partial("agents.teacher", "Agents & Skills", "Teacher Agent", "Teach-once / routine is Grok Bot parity target; skill markdown inject exists"),
  partial("agents.coder", "Agents & Skills", "Coder Agent", "Repository coding tools, HTML preview, GitHub loop driver"),
  partial("agents.researcher", "Agents & Skills", "Researcher Agent", "Web search/browse tools exist"),
  partial("agents.data", "Agents & Skills", "Data Analyst Agent", "Data/database tools + grok.neon skill"),
  planned("agents.legal_account", "Agents & Skills", "Thai Legal / Account Agent"),
  planned("agents.skill_xp", "Agents & Skills", "Skill XP System"),
  partial("agents.custom_skill", "Agents & Skills", "Custom Skill Builder", "Skill registry + imported Grok skills; UI builder planned"),
  partial("agents.collaboration", "Agents & Skills", "Agent Collaboration Chat", "Core skill router composes multiple skills per intent"),
  partial("agents.one_click_deploy", "Agents & Skills", "One-Click Deploy Agent", "Publisher + auto-verify after puter_hosting_create"),

  // ── 4. BotFlow Visualizer ────────────────────────────────────────
  partial("flow.timeline", "BotFlow Visualizer", "Debug Timeline", "Agent loop emits step/activity records"),
  partial("flow.live_stream", "BotFlow Visualizer", "Live Token / Activity Streaming", "runAgentStream is wired in the chat"),
  planned("flow.netflix", "BotFlow Visualizer", "Cinematic Flow"),
  planned("flow.heatmap", "BotFlow Visualizer", "Performance Heatmap"),
  planned("flow.video", "BotFlow Visualizer", "Flow Video Export"),
  planned("flow.modes", "BotFlow Visualizer", "Compact / Cinematic Modes"),
  planned("flow.replay", "BotFlow Visualizer", "Error Replay"),
  planned("flow.branching", "BotFlow Visualizer", "Branching Flow"),
  planned("flow.badge", "BotFlow Visualizer", "BotFlow Badge"),
  planned("flow.sound", "BotFlow Visualizer", "Completion Sound"),

  // ── 5. Integrations ──────────────────────────────────────────────
  implemented("integrations.github_issue_pr", "GitHub / Discord / Telegram", "GitHub Issue → PR", "github-loop-driver: branch→edit→commit→PR→CI→repair→verify"),
  partial("integrations.github_agents", "GitHub / Discord / Telegram", "GitHub Agent Instructions", ".github surface + AGENTS.md"),
  planned("integrations.discord_rich", "GitHub / Discord / Telegram", "Discord Rich Slash Command"),
  planned("integrations.telegram_miniapp", "GitHub / Discord / Telegram", "Telegram Mini App"),
  planned("integrations.github_action", "GitHub / Discord / Telegram", "BossnuGrok GitHub Action"),
  planned("integrations.auto_label", "GitHub / Discord / Telegram", "Auto Label PR"),
  planned("integrations.standup", "GitHub / Discord / Telegram", "Daily Standup Bot"),
  planned("integrations.api_playground", "GitHub / Discord / Telegram", "HTTP API Key + Playground"),
  planned("integrations.webhooks", "GitHub / Discord / Telegram", "Webhook Integration"),
  partial("integrations.presence", "GitHub / Discord / Telegram", "24/7 Bot Presence", "Background sandbox + Render always-on host; full bot presence planned"),

  // ── 6. Reliability ───────────────────────────────────────────────
  partial("reliability.streaming_latency", "Performance & Reliability", "Fast First Token", "Streaming activity path exists; latency instrumentation remains"),
  planned("reliability.edge_cache", "Performance & Reliability", "Edge Caching"),
  planned("reliability.offline_queue", "Performance & Reliability", "Offline Queue"),
  partial("reliability.sandbox", "Performance & Reliability", "Isolated Sandbox Runtime", "Browser sandbox/runtime tools exist"),
  planned("reliability.rate_limit", "Performance & Reliability", "Smart Rate Limit"),
  implemented("reliability.retry", "Performance & Reliability", "Provider Retry", "Gateway retries across distinct models/providers"),
  planned("reliability.health", "Performance & Reliability", "Production Health Endpoint"),
  planned("reliability.analytics", "Performance & Reliability", "Vercel Analytics / Speed Insights"),
  partial("reliability.docker", "Performance & Reliability", "Docker Deploy", "Render deployment configuration exists"),
  partial("reliability.pglite", "Performance & Reliability", "PGlite Fallback", "PGlite is part of the repository"),

  // ── 7. Demo & Pitch ──────────────────────────────────────────────
  planned("demo.three_buttons", "Demo & Pitch", "Three Live Demo Commands"),
  planned("demo.before_after", "Demo & Pitch", "Before / After Comparison"),
  planned("demo.cost_slide", "Demo & Pitch", "Cost Comparison Slide"),
  planned("demo.video", "Demo & Pitch", "60-second Demo Video"),
  planned("demo.judge_mode", "Demo & Pitch", "Judge Mode"),
  planned("demo.testimonials", "Demo & Pitch", "Testimonials"),
  planned("demo.star_history", "Demo & Pitch", "Star History"),
  partial("demo.checklist", "Demo & Pitch", "Grokathon Checklist", "docs/E2E_BENCHMARK + capabilities API"),
  partial("demo.pitch", "Demo & Pitch", "One-Line Pitch", "Philosophy + motto in catalog"),
  planned("demo.live_users", "Demo & Pitch", "Live Users Counter"),

  // ── 8. Growth ────────────────────────────────────────────────────
  planned("growth.star_unlock", "Growth & Community", "Star to Unlock"),
  planned("growth.referral", "Growth & Community", "Referral Links"),
  planned("growth.templates", "Growth & Community", "Template Gallery"),
  planned("growth.community_badge", "Growth & Community", "Community Badge"),
  planned("growth.wall_of_fame", "Growth & Community", "Wall of Fame"),
  planned("growth.product_hunt", "Growth & Community", "Product Hunt Launch"),
  partial("growth.readme_bilingual", "Growth & Community", "Thai + English README", "Repository documentation already contains Thai/English material"),
  planned("growth.bounty", "Growth & Community", "Contribution Bounty"),
  planned("growth.framework_article", "Growth & Community", "Why We Don't Need a Framework"),
  planned("growth.puter_showcase", "Growth & Community", "Puter Showcase Submission"),

  // ── 9. Vibe Work ─────────────────────────────────────────────────
  planned("vibe.mood", "Vibe Work & Team", "Team Mood Meter"),
  planned("vibe.avatar", "Vibe Work & Team", "Agent Avatars"),
  planned("vibe.celebration", "Vibe Work & Team", "Completion Celebration"),
  planned("vibe.daily_xp", "Vibe Work & Team", "Daily XP Summary"),
  planned("vibe.voice", "Vibe Work & Team", "Boss Voice"),
  partial("vibe.themes", "Vibe Work & Team", "Theme System", "Existing UI has theme infrastructure"),
  partial("vibe.history_search", "Vibe Work & Team", "Command History", "Chat history exists"),
  partial("vibe.multilingual", "Vibe Work & Team", "Multi-language Commander", "Thai-first routing with multilingual model access"),
  planned("vibe.accessibility", "Vibe Work & Team", "Accessibility Pass"),
  planned("vibe.easter_egg", "Vibe Work & Team", "Easter Egg"),

  // ── 10. Judge / production ───────────────────────────────────────
  implemented("judge.capabilities_api", "Judge / Production", "/api/capabilities", "Machine-readable capability registry"),
  planned("judge.kernel_diagram", "Judge / Production", "Kernel Diagram"),
  partial("judge.security_guard", "Judge / Production", "Prompt Injection Guard", "Public/private web boundary and authenticated tool paths exist"),
  planned("judge.cost_calculator", "Judge / Production", "Cost Comparison Calculator"),
  planned("judge.metrics", "Judge / Production", "Open Source Metrics"),
  partial("judge.roadmap", "Judge / Production", "v0.3 → v1.0 Roadmap", "ROADMAP_TO_TOP_TIER.md + E2E benchmark docs"),
  partial("judge.puter_grok_story", "Judge / Production", "Why Puter + Grok", "Puter-first architecture is documented in the model gateway"),
  partial("judge.live_demo", "Judge / Production", "Live Demo Link", "https://panupanboss.onrender.com chat production-ready"),
  planned("judge.vercel_deploy", "Judge / Production", "One-Click Vercel Deploy"),
  partial("judge.repo_identity", "Judge / Production", "BossnuGrok Repo Identity", "Panupan33 + SOUL + philosophy docs"),

  // ── 11. Grok Bot parity (from ai.x.grok.bot product) ─────────────
  // Source: Play Store listing — AI coworker that finishes real work
  partial("bot.handoff_real_work", "Grok Bot Parity", "Hand off real work across tools", "Agent tools + GitHub/Puter; full browser-login coworker planned"),
  partial("bot.multi_step_workflow", "Grok Bot Parity", "Multi-step workflows without living in chat", "Agent loop plan→act→verify; approval UX partial"),
  partial("bot.message_like_coworker", "Grok Bot Parity", "Message AI coworker from phone or desktop", "Web chat responsive; native Android app planned"),
  planned("bot.parallel_bots", "Grok Bot Parity", "Many bots in parallel on different jobs"),
  planned("bot.teach_once_routine", "Grok Bot Parity", "Show workflow once → runs as routine"),
  partial("bot.approve_gate", "Grok Bot Parity", "Stay in loop only when approval needed", "Verification gate + self-critique; explicit approve UI planned"),
  partial("bot.cloud_computer", "Grok Bot Parity", "Work continues after laptop closed", "Background sandbox + Render host; dedicated cloud VM planned"),
  planned("bot.connector_login", "Grok Bot Parity", "Log into vendor portals / CRM / ad managers"),
  planned("bot.sales_outbound", "Grok Bot Parity", "Sales outbound: research, drafts, CRM"),
  planned("bot.talent_scout", "Grok Bot Parity", "Talent scout: source candidates, ATS skip"),
  planned("bot.inbox_manager", "Grok Bot Parity", "Inbox triage + draft replies (no send without you)"),
  planned("bot.expense_manager", "Grok Bot Parity", "Expense pull/code across portals"),
  planned("bot.invoice_collector", "Grok Bot Parity", "Vendor portal invoice download"),
  planned("bot.account_health", "Grok Bot Parity", "Account health digests + risk flags"),
  partial("bot.bug_reproduction", "Grok Bot Parity", "Bug reproduction write-up for eng", "Sandbox + code tools can recreate; structured handoff planned"),
  planned("bot.competitive_intel", "Grok Bot Parity", "Overnight competitive intelligence watch"),
  partial("bot.shared_thread", "Grok Bot Parity", "Same thread phone ↔ desktop", "Thread persistence via Puter KV / chat history"),
  partial("bot.context_memory", "Grok Bot Parity", "Remembers preferences across handoffs", "TaskState resume memory in agent.functions"),
  planned("bot.specialist_lanes", "Grok Bot Parity", "Specialist bot per lane + coordinator"),
  planned("bot.mobile_notifications", "Grok Bot Parity", "Notify when bot needs approval or has result"),

  // ── 12. Grok workspace skills (usable registry) ──────────────────
  implemented("skill.design_ui", "Grok Skills", "design-ui", ".grok/skills/design-ui + grok-skills.ts trigger route"),
  implemented("skill.building_games", "Grok Skills", "building-games", ".grok/skills/building-games registered + routed"),
  implemented("skill.controls", "Grok Skills", "controls", "WASD / vehicle control skill + hard A=left rule"),
  partial("skill.auth", "Grok Skills", "auth", "Skill markdown + Better Auth stack; skill trigger registered"),
  partial("skill.neon", "Grok Skills", "neon", "Skill + PGlite/Neon paths in repo"),
  partial("skill.xai_api", "Grok Skills", "xai-api", "Skill markdown; server XAI_API_KEY path"),
  partial("skill.generate2dsprite", "Grok Skills", "generate2dsprite", "Skill registered; Imagine tool when available"),
  partial("skill.generate2dmap", "Grok Skills", "generate2dmap", "Skill registered"),
  partial("skill.multiplayer_p2p", "Grok Skills", "multiplayer-p2p", "Skill + /api/rtc target"),
  partial("skill.threejs", "Grok Skills", "threejs", "Skill registered"),
  partial("skill.og", "Grok Skills", "og", "Skill registered; public/og assets"),
  partial("skill.imagine", "Grok Skills", "imagine", "Skill + xai-api pairing"),

  // ── 13. Boss engine deep (from implementation progress) ──────────
  implemented("engine.github_loop_driver", "Boss Engine", "GitHub Loop Driver", "Deterministic branch→PR→CI→repair state machine"),
  implemented("engine.task_memory", "Boss Engine", "Persistent Task Memory", "Puter KV boss:task resume across sessions"),
  partial("engine.publisher_verify", "Boss Engine", "Publish + Auto-Verify", "autoVerifyAfterPublish after hosting create"),
  implemented("engine.evidence_gate", "Boss Engine", "Evidence Gate", "Verification before success claims"),
  partial("engine.budget_loop", "Boss Engine", "Budget + Loop Detect", "agent-loop budget and duplicate-action prevention"),
  partial("engine.self_critique", "Boss Engine", "Self-Critique", "Pre-answer critique step in agent loop"),
  implemented("engine.soul_vow", "Boss Engine", "SOUL Vow Injection", "SYSTEM_PROMPTS + SOUL.md autonomy contract"),
  partial("engine.super1_one_chat", "Boss Engine", "SUPER1 One Chat 100", "super-chat capability manifest + prompt injection"),
];

export const CAPABILITY_VERSION = "0.2.0";
export const CAPABILITY_COUNT = BOSS_CAPABILITIES.length;

export function getCapabilitySnapshot() {
  const counts = BOSS_CAPABILITIES.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { implemented: 0, partial: 0, planned: 0 } as Record<CapabilityStatus, number>,
  );

  return {
    name: "BossnuGrok",
    version: CAPABILITY_VERSION,
    philosophy:
      "Open web → give a goal → Boss plans → acts → observes → verifies → reports evidence. " +
      "Parity target: Grok Bot coworker that finishes real work (not chat drafts).",
    modelGateway: {
      primary: "Puter",
      fallback: ["OpenRouter"],
      primaryModels: ["gpt-5.6-luna", "claude-opus-4-8", "gemini-3.1-flash-lite"],
    },
    sources: {
      grokBotPlay: "https://play.google.com/store/apps/details?id=ai.x.grok.bot",
      live: "https://panupanboss.onrender.com/",
      repo: "https://github.com/appleid7899067-netizen/Panupan33",
    },
    counts,
    total: BOSS_CAPABILITIES.length,
    capabilities: BOSS_CAPABILITIES,
  };
}
