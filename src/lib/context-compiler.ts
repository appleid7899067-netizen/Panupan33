/** Fast context compiler: keep normal chat cheap and relevant. */
export function compileChatContext(args: {
  messages: Array<{ role: string; content: string }>;
  memory?: string[];
  query: string;
  maxMessages?: number;
  maxMemory?: number;
  maxChars?: number;
}): string {
  const maxMessages = args.maxMessages ?? 8;
  const maxMemory = args.maxMemory ?? 6;
  const maxChars = args.maxChars ?? 12000;
  const terms = args.query.toLowerCase().split(/\s+/).filter((x) => x.length >= 3).slice(0, 12);
  const score = (content: string) => terms.reduce((n, term) => n + (content.toLowerCase().includes(term) ? 1 : 0), 0);
  const recent = args.messages.slice(-maxMessages);
  const olderRelevant = args.messages.slice(0, -maxMessages).filter((m) => score(m.content) > 0).slice(-3);
  const selected = [...olderRelevant, ...recent];
  const history = selected.map((m) => m.role.toUpperCase() + ": " + m.content.slice(0, 1800)).join("\n\n");
  const memory = (args.memory ?? []).slice(0, maxMemory).map((m) => m.slice(0, 600)).filter(Boolean).join("\n- ");
  return [
    "Use only the context below when it helps answer the current request. Do not re-process unrelated history.",
    history ? "Recent/relevant conversation:\n" + history : "",
    memory ? "Relevant saved memory:\n- " + memory : "",
  ].filter(Boolean).join("\n\n").slice(0, maxChars);
}