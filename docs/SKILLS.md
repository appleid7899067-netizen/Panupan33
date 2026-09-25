# Skills

Skills must be **usable** — registered, triggered, and followed — not decorative lists.

## Core skills (Boss engine)

1. **Memory & Context** — compress context, resume tasks without treating memory as proof
2. **Web Search & Scraping** — evidence from the live web
3. **Code Execution & Math** — run and verify code
4. **API Calling** — real HTTP / service calls
5. **Data Parsing & Formatting** — structured data transforms

## Grok workspace skills (`.grok/skills/`)

Imported from the Grok App Builder workspace. Each has a real `SKILL.md` + triggers.
Router: `src/lib/boss-engine/grok-skills.ts` + `core-skill-router.ts`.

| id | When it fires |
|----|----------------|
| `grok.design-ui` | UI / polish / landing / theme |
| `grok.building-games` | playable games |
| `grok.controls` | WASD / vehicle / flight (A must turn left) |
| `grok.auth` | login / accounts |
| `grok.neon` | database / postgres |
| `grok.xai-api` | xAI / Imagine / voice |
| `grok.generate2dsprite` | sprite sheets |
| `grok.generate2dmap` | tile maps / levels |
| `grok.multiplayer-p2p` | co-op / WebRTC |
| `grok.threejs` | Three.js / 3D |
| `grok.og` | og image / favicon / PWA |
| `grok.imagine` | image/video generation prompts |

## Contract

1. User intent → `matchGrokSkills(text)` + intent route
2. Matched skills inject path to `SKILL.md`
3. Agent **must open and obey** that file before coding
4. Never invent tools that are not in the available tools list
