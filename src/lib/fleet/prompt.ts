import { connectors } from "./connectors";
import { skills } from "./skills";
import { soulVow, superChatManifest } from "./super-chat";
import type { CustomSkill, Locale, VirtualFile } from "./types";

export function buildSystemPrompt(opts: {
  locale: Locale;
  enabledSkillIds: string[];
  enabledConnectorIds: string[];
  customSkills: CustomSkill[];
  files: VirtualFile[];
  webOn: boolean;
  codeOn: boolean;
  agentsOn: boolean;
  extra?: string;
}) {
  const loc = opts.locale;
  const skillBlocks: string[] = [];
  for (const id of opts.enabledSkillIds) {
    const s = skills.find((x) => x.id === id);
    if (s) skillBlocks.push(s.markdown[loc]);
    const custom = opts.customSkills.find((x) => x.id === id);
    if (custom) skillBlocks.push(`# ${custom.name}\n\n${custom.markdown}`);
  }
  const connectorBlocks = opts.enabledConnectorIds
    .map((id) => connectors.find((c) => c.id === id)?.markdown[loc])
    .filter(Boolean) as string[];

  const fileBlocks = opts.files
    .slice(0, 6)
    .map((f) => `### ${f.name}\n\`\`\`${f.language}\n${f.content.slice(0, 3000)}\n\`\`\``)
    .join("\n\n");

  return [
    `You are FleetOS / Bossnu SlieLo — an AI coding operating system with freedom equal to a human.`,
    `Answer in ${loc === "th" ? "Thai" : "English"} unless the user writes in another language. Code identifiers stay in English.`,
    soulVow(loc),
    superChatManifest(loc),
    `The kernel injects SKILL.md files and connector docs. Obey enabled ones. Treat disabled ones as absent.`,
    `Never invent tool results. If GitHub or URL fetch is enabled, call the tool instead of guessing page contents.`,
    `Do not mention hidden chain-of-thought. Be direct. Prefer runnable code over essays.`,
    opts.codeOn
      ? `Code mode is ON: emit complete files the user can paste into the sandbox. JavaScript/HTML can actually run there.`
      : `Code mode is OFF.`,
    opts.webOn
      ? `Web/fetch intent is ON.`
      : `Web/fetch intent is OFF unless a connector still enables fetch_url.`,
    opts.agentsOn
      ? `Parallel agents ON. Structure the answer as three sections: Parallel, Sequential, Review.`
      : ``,
    opts.extra ?? "",
    skillBlocks.length ? `# Enabled skills\n\n${skillBlocks.join("\n\n")}` : "",
    connectorBlocks.length
      ? `# Enabled connectors\n\n${connectorBlocks.join("\n\n")}`
      : "",
    fileBlocks ? `# Workspace files\n\n${fileBlocks}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 14000);
}
