/**
 * Boss markdown renderer — copy + wrap, break long URLs
 */
import { useState } from "react";
import { maskInternalUrls } from "@/lib/ui-safe";

export function BossMarkdown({
  content,
  onCopyCode,
  onDownloadCode,
}: {
  content: string;
  onCopyCode?: (code: string) => void;
  onDownloadCode?: (code: string, language: string) => void;
}) {
  const fence = String.fromCharCode(96, 96, 96);
  const parts = content.split(fence);
  return (
    <div className="space-y-3 break-words">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const lines = part.split("\n");
          const language = lines[0]?.trim() || "";
          const code = lines.slice(1).join("\n");
          const isHtml = /^(html|htm|xhtml)$/i.test(language);
          return (
            <CodeFence
              key={i}
              language={language}
              code={code}
              isHtml={isHtml}
              onCopyCode={onCopyCode}
              onDownloadCode={onDownloadCode}
            />
          );
        }
        return (
          <div key={i} className="space-y-1.5">
            {part.split("\n").map((line, j) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={j} className="h-1" />;
              const display = maskInternalUrls(line, "display");
              if (/^#{1,6}\s/.test(trimmed))
                return (
                  <div key={j} className="font-semibold text-zinc-100">
                    {formatInline(trimmed.replace(/^#{1,6}\s+/, ""))}
                  </div>
                );
              if (/^[-*]\s+/.test(trimmed))
                return (
                  <div key={j} className="pl-3">
                    {formatInline("• " + trimmed.replace(/^[-*]\s+/, ""))}
                  </div>
                );
              if (/^\d+\.\s+/.test(trimmed)) return <div key={j}>{formatInline(display)}</div>;
              if (/^>\s?/.test(trimmed))
                return (
                  <div key={j} className="border-l-2 border-zinc-700 pl-3 text-zinc-400">
                    {formatInline(trimmed.replace(/^>\s?/, ""))}
                  </div>
                );
              return (
                <div key={j} className="break-words">
                  {formatInline(display)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CodeFence({
  language,
  code,
  isHtml,
  onCopyCode,
  onDownloadCode,
}: {
  language: string;
  code: string;
  isHtml: boolean;
  onCopyCode?: (code: string) => void;
  onDownloadCode?: (code: string, language: string) => void;
}) {
  const [wrap, setWrap] = useState(true);
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">
          {isHtml ? "HTML Preview" : language || "CODE"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWrap((w) => !w)}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700"
            title={wrap ? "เลื่อนแนวนอน" : "ตัดบรรทัด"}
          >
            {wrap ? "Wrap" : "Scroll"}
          </button>
          <button
            type="button"
            onClick={() => onCopyCode?.(code)}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-zinc-100 bg-zinc-700 hover:bg-zinc-600"
            title="คัดลอกโค้ด"
          >
            คัดลอก
          </button>
          <button
            type="button"
            onClick={() => onDownloadCode?.(code, language)}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700"
            title="ดาวน์โหลดโค้ด"
          >
            ดาวน์โหลด
          </button>
        </div>
      </div>
      {isHtml && (
        <div className="bg-white">
          <iframe
            title="HTML Preview"
            srcDoc={code}
            sandbox="allow-scripts"
            className="block h-[min(520px,65vh)] w-full border-0"
            style={{ colorScheme: "light" }}
          />
        </div>
      )}
      <pre
        className={
          "border-t border-zinc-800 p-3 text-[12px] leading-5 text-zinc-200 " +
          (wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto whitespace-pre")
        }
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function formatInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|<br\s*\/?\s*>)/gi);
  return tokens.map((token, i) => {
    if (/^\*\*[^*]+\*\*$/.test(token)) return <strong key={i}>{token.slice(2, -2)}</strong>;
    if (/^<br\s*\/?\s*>$/i.test(token)) return <br key={i} />;
    return <span key={i}>{token}</span>;
  });
}
