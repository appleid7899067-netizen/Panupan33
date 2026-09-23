/**
 * BossnuGrok capability registry.
 *
 * This is the machine-readable contract for the Commander. It lists the
 * 100-product upgrades without pretending an item is implemented when it is
 * only planned. The API returns implementation status so demos and agents can
 * distinguish real capabilities from roadmap items.
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
  // 1. Commander UX
  implemented("ux.one_prompt_victory", "Commander UX", "One-Prompt Victory", "Agent kernel + autonomous plan/execute/verify loop"),
  planned("ux.command_templates", "Commander UX", "Command Templates"),
  partial("ux.auto_file_export", "Commander UX", "Auto File Export", "Chat already supports response/code download"),
  partial("ux.voice_commander", "Commander UX", "Voice Commander", "Browser Thai speech input is wired"),
  partial("ux.mobile_commander", "Commander UX", "Mobile Commander Mode", "Responsive chat surface exists"),
  partial("ux.drag_drop", "Commander UX", "Drag & Drop Anything", "Attachment flow exists; autonomous routing can be extended"),
  planned("ux.result_card", "Commander UX", "Result Card"),
  planned("ux.undo_redo", "Commander UX", "Undo / Redo Command"),
  planned("ux.share_result", "Commander UX", "Share Result Link"),
  planned("ux.onboarding", "Commander UX", "30-second Interactive Onboarding"),

  // 2. AI Kernel & Model
  implemented("ai.puter_primary", "AI Kernel & Model", "Puter Primary Gateway", "Server gateway routes to Puter before OpenRouter"),
  implemented("ai.multi_model_fallback", "AI Kernel & Model", "Multi-Model Fallback", "Puter model pool + OpenRouter last-resort fallback"),
  implemented("ai.context_kernel", "AI Kernel & Model", "Execution Context Kernel", "Goal contract, observations, failures and verification gate"),
  implemented("ai.self_correction", "AI Kernel & Model", "Self-Correction Loop", "Failure-aware recovery hints and repeated-action prevention"),
  planned("ai.cost_meter", "AI Kernel & Model", "Live Cost Meter"),
  planned("ai.prompt_cache", "AI Kernel & Model", "Prompt Caching"),
  planned("ai.parallel_agents", "AI Kernel & Model", "Parallel Agents"),
  partial("ai.user_pays", "AI Kernel & Model", "Puter User-Pays Visibility", "Puter is configured as the primary user/server gateway"),
  partial("ai.vision", "AI Kernel & Model", "Vision Routing", "Live Puter catalog is available to the client"),
  implemented("ai.thai_first", "AI Kernel & Model", "Thai-First Commander", "Intent and recovery rules recognize Thai commands"),

  // 3. Agents & Skills
  planned("agents.marketplace", "Agents & Skills", "Agent Marketplace"),
  planned("agents.teacher", "Agents & Skills", "Teacher Agent"),
  partial("agents.coder", "Agents & Skills", "Coder Agent", "Repository coding tools and HTML preview already exist"),
  partial("agents.researcher", "Agents & Skills", "Researcher Agent", "Web search/browse tools exist"),
  partial("agents.data", "Agents & Skills", "Data Analyst Agent", "Data/database tools exist"),
  planned("agents.legal_account", "Agents & Skills", "Thai Legal / Account Agent"),
  planned("agents.skill_xp", "Agents & Skills", "Skill XP System"),
  planned("agents.custom_skill", "Agents & Skills", "Custom Skill Builder"),
  planned("agents.collaboration", "Agents & Skills", "Agent Collaboration Chat"),
  planned("agents.one_click_deploy", "Agents & Skills", "One-Click Deploy Agent"),

  // 4. BotFlow Visualizer
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

  // 5. Integrations
  partial("integrations.github_issue_pr", "GitHub / Discord / Telegram", "GitHub Issue → PR", "GitHub mutation tools and repository loop exist"),
  partial("integrations.github_agents", "GitHub / Discord / Telegram", "GitHub Agent Instructions", ".github surface exists"),
  planned("integrations.discord_rich", "GitHub / Discord / Telegram", "Discord Rich Slash Command"),
  planned("integrations.telegram_miniapp", "GitHub / Discord / Telegram", "Telegram Mini App"),
  planned("integrations.github_action", "GitHub / Discord / Telegram", "BossnuGrok GitHub Action"),
  planned("integrations.auto_label", "GitHub / Discord / Telegram", "Auto Label PR"),
  planned("integrations.standup", "GitHub / Discord / Telegram", "Daily Standup Bot"),
  planned("integrations.api_playground", "GitHub / Discord / Telegram", "HTTP API Key + Playground"),
  planned("integrations.webhooks", "GitHub / Discord / Telegram", "Webhook Integration"),
  planned("integrations.presence", "GitHub / Discord / Telegram", "24/7 Bot Presence"),

  // 6. Reliability
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

  // 7. Demo & Pitch
  planned("demo.three_buttons", "Demo & Pitch", "Three Live Demo Commands"),
  planned("demo.before_after", "Demo & Pitch", "Before / After Comparison"),
  planned("demo.cost_slide", "Demo & Pitch", "Cost Comparison Slide"),
  planned("demo.video", "Demo & Pitch", "60-second Demo Video"),
  planned("demo.judge_mode", "Demo & Pitch", "Judge Mode"),
  planned("demo.testimonials", "Demo & Pitch", "Testimonials"),
  planned("demo.star_history", "Demo & Pitch", "Star History"),
  planned("demo.checklist", "Demo & Pitch", "Grokathon Checklist"),
  planned("demo.pitch", "Demo & Pitch", "One-Line Pitch"),
  planned("demo.live_users", "Demo & Pitch", "Live Users Counter"),

  // 8. Growth
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

  // 9. Vibe Work
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

  // 10. Judge / production surface
  implemented("judge.capabilities_api", "Judge / Production", "/api/capabilities", "Machine-readable capability registry"),
  planned("judge.kernel_diagram", "Judge / Production", "Kernel Diagram"),
  partial("judge.security_guard", "Judge / Production", "Prompt Injection Guard", "Public/private web boundary and authenticated tool paths exist"),
  planned("judge.cost_calculator", "Judge / Production", "Cost Comparison Calculator"),
  planned("judge.metrics", "Judge / Production", "Open Source Metrics"),
  planned("judge.roadmap", "Judge / Production", "v0.3 → v1.0 Roadmap"),
  partial("judge.puter_grok_story", "Judge / Production", "Why Puter + Grok", "Puter-first architecture is documented in the model gateway"),
  partial("judge.live_demo", "Judge / Production", "Live Demo Link", "Chat route is production-ready"),
  planned("judge.vercel_deploy", "Judge / Production", "One-Click Vercel Deploy"),
  planned("judge.repo_identity", "Judge / Production", "BossnuGrok Repo Identity"),
];

export const CAPABILITY_VERSION = "0.1.0";
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
    philosophy: "Open web → give a goal → Boss plans → acts → observes → verifies → reports evidence.",
    modelGateway: {
      primary: "Puter",
      fallback: ["OpenRouter"],
      primaryModels: ["gpt-5.6-luna", "claude-opus-4-8", "gemini-3.1-flash-lite"],
    },
    counts,
    total: BOSS_CAPABILITIES.length,
    capabilities: BOSS_CAPABILITIES,
  };
}
