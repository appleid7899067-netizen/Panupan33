import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Block =
  | { type: "code"; lang: string; content: string }
  | { type: "p"; content: string }
  | { type: "h"; level: 1 | 2 | 3; content: string }
  | { type: "li"; content: string; ordered?: boolean }
  | { type: "quote"; content: string };

function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      out.push({ type: "code", lang, content: buf.join("\n") });
      i += 1;
      continue;
    }
    if (/^###\s/.test(line)) {
      out.push({ type: "h", level: 3, content: line.replace(/^###\s+/, "") });
      i += 1;
      continue;
    }
    if (/^##\s/.test(line)) {
      out.push({ type: "h", level: 2, content: line.replace(/^##\s+/, "") });
      i += 1;
      continue;
    }
    if (/^#\s/.test(line)) {
      out.push({ type: "h", level: 1, content: line.replace(/^#\s+/, "") });
      i += 1;
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      out.push({ type: "li", content: line.replace(/^[-*]\s+/, "") });
      i += 1;
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      out.push({ type: "li", ordered: true, content: line.replace(/^\d+\.\s+/, "") });
      i += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      out.push({ type: "quote", content: line.slice(2) });
      i += 1;
      continue;
    }
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    out.push({ type: "p", content: line });
    i += 1;
  }
  return out;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code key={i} className="rounded-xs bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-primary">
              {p.slice(1, -1)}
            </code>
          );
        }
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-medium text-fg">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const isMermaid = lang.toLowerCase() === "mermaid";
  return (
    <div className="group relative my-3 overflow-hidden rounded-lg bg-bg shadow-[var(--shadow-border)]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-subtle">
          {lang || "code"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy code"
          onClick={async () => {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      {isMermaid ? (
        <MermaidBlock source={content} />
      ) : (
        <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-fg">
          <code>{content}</code>
        </pre>
      )}
    </div>
  );
}

function MermaidBlock({ source }: { source: string }) {
  return (
    <div className="space-y-2 p-3">
      <div className="rounded-md bg-elevated p-4 font-mono text-[12px] leading-relaxed text-primary whitespace-pre-wrap">
        {source}
      </div>
      <p className="text-[11px] text-subtle">Mermaid source — paste into any renderer, or keep it in the repo.</p>
    </div>
  );
}

export function MarkdownOutput({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className={cn("text-sm leading-relaxed text-fg", className)}>
      {blocks.map((b, i) => {
        if (b.type === "code") return <CodeBlock key={i} lang={b.lang} content={b.content} />;
        if (b.type === "h") {
          const cls =
            b.level === 1
              ? "mt-5 mb-2 text-lg font-medium tracking-tight"
              : b.level === 2
                ? "mt-4 mb-1.5 text-base font-medium tracking-tight"
                : "mt-3 mb-1 text-sm font-medium";
          return (
            <div key={i} className={cls}>
              <Inline text={b.content} />
            </div>
          );
        }
        if (b.type === "li") {
          return (
            <div key={i} className="flex gap-2 py-0.5 text-muted">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
              <span>
                <Inline text={b.content} />
              </span>
            </div>
          );
        }
        if (b.type === "quote") {
          return (
            <blockquote key={i} className="my-2 border-l-2 border-primary/50 pl-3 text-muted">
              <Inline text={b.content} />
            </blockquote>
          );
        }
        return (
          <p key={i} className="my-1.5 text-muted">
            <Inline text={b.content} />
          </p>
        );
      })}
    </div>
  );
}

export function extractFirstCode(text: string): { lang: string; content: string } | null {
  const m = text.match(/```([\w+-]*)\n([\s\S]*?)```/);
  if (!m) return null;
  return { lang: m[1] || "txt", content: m[2].trim() };
}
