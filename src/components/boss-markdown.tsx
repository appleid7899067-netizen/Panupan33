import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";

function formatInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|<br\s*\/?\s*>)/gi);
  return tokens.map((token, i) => {
    if (/^\*\*[^*]+\*\*$/.test(token)) return <strong key={i}>{token.slice(2, -2)}</strong>;
    if (/^<br\s*\/?\s*>$/i.test(token)) return <br key={i} />;
    return <span key={i}>{token}</span>;
  });
}

export function BossMarkdown({
  content,
  onCopyCode,
  onDownloadCode,
}: {
  content: string;
  onCopyCode?: (code: string) => void;
  onDownloadCode?: (code: string, language: string) => void;
}) {
  const [wrap, setWrap] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const fence = String.fromCharCode(96, 96, 96);
  const parts = useMemo(() => content.split(fence), [content]);

  const copy = async (code: string) => {
    if (onCopyCode) return onCopyCode(code);
    try { await navigator.clipboard.writeText(code); setCopied(code); window.setTimeout(() => setCopied(null), 1200); } catch {}
  };

  return (
    <div className="space-y-3 break-words">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const lines = part.split("\n");
          const language = lines[0]?.trim() || "";
          const code = lines.slice(1).join("\n");
          const isHtml = /^(html|htm|xhtml)$/i.test(language);
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">{isHtml ? "HTML Preview" : language || "CODE"}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setWrap((v) => !v)} className="rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                    {wrap ? "Scroll" : "Wrap"}
                  </button>
                  <button type="button" onClick={() => void copy(code)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                    {copied === code ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                    {copied === code ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                  <button type="button" onClick={() => onDownloadCode?.(code, language)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                    <Download className="size-3" /> ดาวน์โหลด
                  </button>
                </div>
              </div>
              {isHtml && (
                <div className="bg-white">
                  <iframe title="HTML Preview" srcDoc={code} sandbox="allow-scripts" className="block h-[min(520px,65vh)] w-full border-0" style={{ colorScheme: "light" }} />
                </div>
              )}
              <pre className={(wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto whitespace-pre") + " border-t border-zinc-800 p-3 text-[12px] leading-5 text-zinc-200"}><code>{code}</code></pre>
            </div>
          );
        }
        return (
          <div key={i} className="space-y-1.5">
            {part.split("\n").map((line, j) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={j} className="h-1" />;
              if (/^#{1,6}\s/.test(trimmed)) return <div key={j} className="font-semibold text-zinc-100">{formatInline(trimmed.replace(/^#{1,6}\s+/, ""))}</div>;
              if (/^[-*]\s+/.test(trimmed)) return <div key={j} className="pl-3">{formatInline("• " + trimmed.replace(/^[-*]\s+/, ""))}</div>;
              if (/^\d+\.\s+/.test(trimmed)) return <div key={j}>{formatInline(trimmed)}</div>;
              if (/^>\s?/.test(trimmed)) return <div key={j} className="border-l-2 border-zinc-700 pl-3 text-zinc-400">{formatInline(trimmed.replace(/^>\s?/, ""))}</div>;
              return <div key={j}>{formatInline(line)}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}
