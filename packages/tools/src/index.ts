export const TOOLS = [
  "github",
  "files",
  "web",
  "sandbox",
  "terminal",
  "render",
  "vercel",
  "railway",
  "netlify",
  "puter",
  "openrouter",
] as const;

export type ToolId = typeof TOOLS[number];
