/**
 * SUPER 1: ONE CHAT - แชทเดียวเหมือน GPT แต่มี 100 อย่างข้างใน
 * รวม 100 ฟีเจอร์เป็นแชทเดียว
 */

import { useEffect, useState, useRef } from "react";
import { Send, Paperclip, Mic, Sparkles, Brain, Wrench, Users, Heart, Hammer, Eye, BookOpen, Zap } from "lucide-react";
import { superChat } from "@/lib/super-chat";
import { useFleet } from "@/lib/store";
import { backgroundLab } from "@/lib/background-sandbox";
import { freeAI } from "@/lib/autonomous";
import { runAgentSandbox } from "@/lib/agent.functions";

export function SuperChat() {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const threads = useFleet((s) => s.threads);
  const activeThreadId = useFleet((s) => s.activeThreadId);
  const appendMessage = useFleet((s) => s.appendMessage);
  const patchMessage = useFleet((s) => s.patchMessage);
  const thread = threads.find(t => t.id === activeThreadId) ?? threads[0];
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stats = superChat?.getStats();

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [thread?.messages]);

  const simulateHumanTyping = async (fullText: string, onUpdate: (text: string) => void) => {
    setIsTyping(true);
    let current = "";
    
    // พิมพ์เหมือนคน: เร็วบ้าง ช้าบ้าง บางทีลบแล้วพิมพ์ใหม่
    for (let i = 0; i < fullText.length; i++) {
      current += fullText[i];
      
      // บางทีพิมพ์ผิดแล้วลบ (5% chance)
      if (Math.random() < 0.05 && current.length > 10) {
        const typo = current + "x";
        onUpdate(typo);
        await new Promise(r => setTimeout(r, 80 + Math.random() * 100));
        onUpdate(current); // ลบ
        await new Promise(r => setTimeout(r, 50));
      } else {
        onUpdate(current);
      }
      
      // ความเร็วไม่สม่ำเสมอเหมือนคน
      const delay = Math.random() < 0.1 ? 150 + Math.random() * 200 : 20 + Math.random() * 60;
      await new Promise(r => setTimeout(r, delay));
      
      setTypingText(current);
    }
    
    setIsTyping(false);
    setTypingText("");
  };

  const handleSend = async () => {
    if (!input.trim() || !thread) return;

    const userText = input;
    setInput("");

    // เพิ่มข้อความ user
    appendMessage(thread.id, { role: "user", content: userText });

    // สร้างข้อความ assistant เปล่าๆ ไว้ก่อน
    const assistantId = appendMessage(thread.id, {
      role: "assistant",
      content: "",
      activity: ["วิเคราะห์", "ยืมเครื่องมือ", "ตรวจตัวเอง"],
    });

    // ประมวลผลแบบ ONE CHAT 100 อย่าง
    // ถ้าข้อความมี code block หรือสั่ง "รันโค้ด" ให้ Boss เรียก Sandbox โดยตรง
    const sandboxMatch = userText.match(/```([\\w-]+)?\\n([\\s\\S]*?)```/);
    const wantsSandbox = Boolean(sandboxMatch) || /(?:รันโค้ด|รัน code|run code|ทดสอบโค้ด|test code|sandbox)/i.test(userText);
    if (wantsSandbox) {
      const language = sandboxMatch?.[1] || "javascript";
      const code = sandboxMatch?.[2] || userText
        .replace(/^.*?(?:รันโค้ด|รัน code|run code|ทดสอบโค้ด|test code|sandbox)[:\\s]*/i, "")
        .trim();
      const sandbox = await runAgentSandbox({ language, code });
      const status = sandbox.ok ? "ผ่าน" : "ไม่ผ่าน";
      const output = [
        `🧪 Sandbox: ${status}`,
        sandbox.stdout ? `stdout:\\n${sandbox.stdout}` : "",
        sandbox.stderr ? `stderr:\\n${sandbox.stderr}` : "",
        `runtime: ${sandbox.runtime ?? "unknown"} | ${sandbox.durationMs ?? 0}ms`,
      ].filter(Boolean).join("\\n\\n");
      await simulateHumanTyping(output, (text) => {
        patchMessage(thread.id, assistantId, text);
      });
      return;
    }

    const result = await superChat?.processMessage(userText, thread.messages) || {
      response: `ได้เลย เดี๋ยวจัดให้ - ${userText}`,
      mode: "thai-slang" as const,
    };

    // จำลองการพิมพ์เหมือนคน
    await simulateHumanTyping(result.response, (text) => {
      patchMessage(thread.id, assistantId, text);
    });

    // ถ้ามี yesterday template ให้ทดสอบใน background lab เงียบๆ
    if (result.yesterdayTemplate) {
      backgroundLab?.testQuietly({
        code: `// Yesterday template: ${result.yesterdayTemplate.title}\nconsole.log("ทดสอบ template: ${result.yesterdayTemplate.id}");`,
        purpose: `ทดสอบ ${result.yesterdayTemplate.title}`,
        createdBy: "free-ai",
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] max-w-3xl mx-auto">
      {/* Header แบบ GPT - โชว์ว่าแชทเดียวมี 100 อย่าง */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-white text-black grid place-items-center font-medium text-sm">B</div>
          <div>
            <div className="text-sm font-medium text-zinc-100">Boss • ONE CHAT</div>
            <div className="text-[11px] text-zinc-500">{stats?.enabled}/100 features • เหมือน GPT แต่มีวิญญาณ</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Sparkles className="size-3" /> {stats?.byCategory.behavior} พฤติกรรม
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Brain className="size-3" /> {stats?.byCategory.model} สมอง
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            <Wrench className="size-3" /> {stats?.byCategory.tool} เครื่องมือ
          </span>
        </div>
      </div>

      {/* Messages แบบ GPT */}
      <div ref={scrollerRef} className="flex-1 overflow-auto px-4 py-6 space-y-6">
        {thread?.messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="size-7 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center shrink-0 mt-0.5">
                <span className="text-[11px]">B</span>
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
              m.role === "user" 
                ? "bg-white text-black" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-100"
            }`}>
              <div className="whitespace-pre-wrap">{m.content || (isTyping && m.id === thread.messages[thread.messages.length-1]?.id ? typingText : "")}</div>
              {m.activity && m.activity.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.activity.map((a, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {m.role === "user" && (
              <div className="size-7 rounded-full bg-zinc-700 grid place-items-center shrink-0 mt-0.5">
                <span className="text-[11px]">U</span>
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center shrink-0">
              <span className="text-[11px]">B</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">•</span>
                <span className="animate-bounce [animation-delay:0.1s]">•</span>
                <span className="animate-bounce [animation-delay:0.2s]">•</span>
              </span>
              <span className="ml-2 text-[11px]">Boss กำลังพิมพ์...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input แบบ GPT */}
      <div className="p-4 border-t border-zinc-800">
        <div className="relative flex items-end gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 p-2">
          <button className="size-8 grid place-items-center rounded-full hover:bg-zinc-800 text-zinc-500">
            <Paperclip className="size-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="พิมพ์อะไรก็ได้... Boss มี 100 อย่างในแชทเดียว"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 resize-none outline-none max-h-32 min-h-[24px] py-1.5"
            rows={1}
          />
          <button className="size-8 grid place-items-center rounded-full hover:bg-zinc-800 text-zinc-500">
            <Mic className="size-4" />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="size-8 grid place-items-center rounded-full bg-white text-black disabled:opacity-30 disabled:bg-zinc-700"
          >
            <Send className="size-4" />
          </button>
        </div>
        
        {/* Features bar - โชว์ว่า 100 อย่างอยู่ในแชทเดียว */}
        <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] text-zinc-600">
          <span className="inline-flex items-center gap-1"><Heart className="size-3" /> มีวิญญาณ</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1"><Zap className="size-3" /> ทำไว้แล้วเมื่อวาน</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1"><BookOpen className="size-3" /> ทำตัวเองให้ดีก่อน</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1"><Eye className="size-3" /> ยืมเครื่องมือโลก</span>
          <span>•</span>
          <span>100 features ใน 1 chat</span>
        </div>
      </div>
    </div>
  );
}
