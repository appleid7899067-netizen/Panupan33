/**
 * Grok workspace skills → Boss skill registry
 *
 * Principle: skills in .grok/skills must be USEABLE.
 * - Registered with real ids + capabilities + triggers
 * - Markdown lives at .grok/skills/<id>/SKILL.md (already in repo)
 * - Router matches user intent → skill ids → injected into agent context
 */

import {
  activateVerifiedSkill,
  normalizeSkill,
  type SkillRecord,
} from "./skill-registry";

export type GrokSkillMeta = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  triggers: string[];
  path: string;
};

/** Full set from the Grok App Builder workspace ZIP — all present under .grok/skills/ */
export const GROK_SKILL_META: readonly GrokSkillMeta[] = [
  {
    id: "grok.design-ui",
    name: "design-ui",
    description:
      "Polished non-generic UI: tokens, layout, type, color, motion, anti-slop. Mandatory for any DOM/HUD surface.",
    capabilities: ["ui", "design", "frontend"],
    triggers: [
      "design",
      "ui",
      "polish",
      "landing",
      "theme",
      "style",
      "redesign",
      "หน้าตา",
      "ดีไซน์",
      "สวย",
    ],
    path: ".grok/skills/design-ui/SKILL.md",
  },
  {
    id: "grok.building-games",
    name: "building-games",
    description:
      "Playable browser games: loop, camera, 3D orientation, perf, genres. Pair with controls before movement.",
    capabilities: ["game", "code", "frontend"],
    triggers: [
      "game",
      "เกม",
      "phaser",
      "three",
      "canvas",
      "playable",
      "platformer",
      "fps",
      "racing",
    ],
    path: ".grok/skills/building-games/SKILL.md",
  },
  {
    id: "grok.controls",
    name: "controls",
    description:
      "Player-visible control signs. A = left. Mandatory self-test window.__controlsTest before ship.",
    capabilities: ["game", "controls"],
    triggers: [
      "controls",
      "wasd",
      "inverted",
      "steer",
      "flight",
      "vehicle",
      "a/d",
      "ควบคุม",
    ],
    path: ".grok/skills/controls/SKILL.md",
  },
  {
    id: "grok.auth",
    name: "auth",
    description:
      "Auth via Grok broker (Google, X) or email/password only. OFF by default. Gate viewers already signed in.",
    capabilities: ["auth", "security"],
    triggers: ["auth", "login", "sign-in", "sign in", "account", "เข้าสู่ระบบ", "สมัคร"],
    path: ".grok/skills/auth/SKILL.md",
  },
  {
    id: "grok.neon",
    name: "neon",
    description:
      "Neon Postgres with local PGLite fallback. OFF by default. Use @/lib/db only.",
    capabilities: ["database", "data"],
    triggers: ["database", "postgres", "neon", "sql", "migration", "db", "ฐานข้อมูล"],
    path: ".grok/skills/neon/SKILL.md",
  },
  {
    id: "grok.xai-api",
    name: "xai-api",
    description:
      "xAI API via XAI_API_KEY: chat, Imagine, voice. Server-only, user-initiated, never mock.",
    capabilities: ["ai", "api"],
    triggers: ["xai", "grok api", "imagine", "generate image", "voice", "xai_api_key"],
    path: ".grok/skills/xai-api/SKILL.md",
  },
  {
    id: "grok.generate2dsprite",
    name: "generate2dsprite",
    description:
      "2D sprite sheets via Imagine tools when listed. Abstract games prefer procedural art.",
    capabilities: ["game", "art", "ai"],
    triggers: ["sprite", "spritesheet", "2d art", "pixel", "สไปรต์"],
    path: ".grok/skills/generate2dsprite/SKILL.md",
  },
  {
    id: "grok.generate2dmap",
    name: "generate2dmap",
    description: "2D layered game maps with props and collision metadata.",
    capabilities: ["game", "art"],
    triggers: ["map", "tileset", "level", "tilemap", "แผนที่", "ด่าน"],
    path: ".grok/skills/generate2dmap/SKILL.md",
  },
  {
    id: "grok.multiplayer-p2p",
    name: "multiplayer-p2p",
    description: "WebRTC P2P mesh at /api/rtc. Only supported multiplayer path.",
    capabilities: ["game", "network"],
    triggers: ["multiplayer", "co-op", "p2p", "webrtc", "realtime", "หลายคน"],
    path: ".grok/skills/multiplayer-p2p/SKILL.md",
  },
  {
    id: "grok.threejs",
    name: "threejs",
    description: "Three.js + TSL reference for real 3D. Pair with building-games.",
    capabilities: ["game", "3d", "frontend"],
    triggers: ["three.js", "threejs", "webgl", "3d", "gltf", "mesh"],
    path: ".grok/skills/threejs/SKILL.md",
  },
  {
    id: "grok.og",
    name: "og",
    description: "Brand assets: og.jpg, X banner, favicon, PWA icons — non-blocking task.",
    capabilities: ["brand", "frontend"],
    triggers: ["og", "favicon", "pwa icon", "social card", "brand asset"],
    path: ".grok/skills/og/SKILL.md",
  },
  {
    id: "grok.imagine",
    name: "imagine",
    description:
      "Prompting/workflow for Imagine image/video. Call tools only when they appear in the available tools list.",
    capabilities: ["ai", "art"],
    triggers: ["imagine", "generate image", "generate video", "prompt art", "วาดรูป"],
    path: ".grok/skills/imagine/SKILL.md",
  },
] as const;

export const GROK_SKILLS: readonly SkillRecord[] = GROK_SKILL_META.map((meta) =>
  activateVerifiedSkill(
    normalizeSkill({
      id: meta.id,
      name: meta.name,
      description: meta.description,
      origin: "imported",
      capabilities: meta.capabilities,
      version: "1.0.0",
    }),
    true,
  ),
);

export function getGrokSkills(): SkillRecord[] {
  return GROK_SKILLS.map((skill) => ({
    ...skill,
    capabilities: [...skill.capabilities],
    verification: skill.verification ? { ...skill.verification } : undefined,
  }));
}

/** Match user text → Grok skill ids (usable routing). */
export function matchGrokSkills(userText: string): GrokSkillMeta[] {
  const lower = userText.toLowerCase();
  return GROK_SKILL_META.filter((meta) =>
    meta.triggers.some((t) => lower.includes(t.toLowerCase())),
  );
}

/** Build a short inject block for the agent system prompt. */
export function grokSkillsPromptBlock(matched: GrokSkillMeta[]): string {
  if (!matched.length) return "";
  const lines = matched.map(
    (m) =>
      `- **${m.name}** (${m.id}): ${m.description}\n  Read and follow: \`${m.path}\``,
  );
  return [
    "# Active Grok skills (follow these — they are real, not decorative)",
    ...lines,
    "Open the SKILL.md path above before coding. Obey hard rules inside.",
  ].join("\n");
}
