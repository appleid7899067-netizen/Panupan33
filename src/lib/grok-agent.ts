import { chatWithPuter } from "@/lib/puter";

export type AgentRunResult = { ok: boolean; text: string; verified?: boolean };

type AgentData = {
  prompt: string; model?: string; context?: string; threadId?: string;
  githubToken?: string; maxIterations?: number; agentSettings?: unknown;
};

export async function* runAgentStream(input: { data: AgentData }): AsyncGenerator<
  { type: "step"; step?: { phase: string; detail: string } } | { type: "done"; result: AgentRunResult }
> {
  const prompt = input.data.context ? input.data.prompt + "\n\nบริบท:\n" + input.data.context : input.data.prompt;
  yield { type: "step", step: { phase: "agent", detail: "กำลังเรียก Grok Build Agent Runtime..." } };
  try {
    const response = await fetch("/api/grok", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, model: "grok-build", cwd: "." }),
    });
    const data = await response.json().catch(() => ({})) as { ok?: boolean; text?: string; error?: string };
    if (response.ok && data.ok && data.text) {
      yield { type: "step", step: { phase: "tools", detail: "Grok Build Runtime ทำงานพร้อม built-in tools" } };
      yield { type: "step", step: { phase: "done", detail: "รับผลจาก Grok Build แล้ว" } };
      yield { type: "done", result: { ok: true, text: data.text, verified: false } };
      return;
    }
    yield { type: "step", step: { phase: "fallback", detail: "Grok Runtime ยังไม่พร้อม จึงใช้ Puter เป็น fallback" } };
  } catch {
    yield { type: "step", step: { phase: "fallback", detail: "Grok Runtime ยังไม่พร้อม จึงใช้ Puter เป็น fallback" } };
  }
  const result = await chatWithPuter({
    model: input.data.model,
    messages: [
      { role: "system", content: "ตอบภาษาไทย ใช้เฉพาะสิ่งที่ตรวจสอบได้ และอย่าอ้างว่าแก้ไฟล์/commit/deploy สำเร็จหากไม่มีหลักฐานจริง" },
      { role: "user", content: prompt },
    ],
  });
  if (!result.ok) throw new Error(result.error);
  yield { type: "done", result: { ok: true, text: result.text, verified: false } };
}

export async function runAgent(input: { data: AgentData }): Promise<AgentRunResult> {
  let result: AgentRunResult = { ok: false, text: "", verified: false };
  for await (const event of runAgentStream(input)) if (event.type === "done") result = event.result;
  return result;
}

export async function runAgentSandbox(input: { data: { language: string; code: string } }) {
  const response = await fetch("/api/sandbox", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ html: input.data.language.toLowerCase() === "html" ? input.data.code : "<!doctype html><html><body><script>" + input.data.code.replace(/<\/script/gi, "<\\/script") + "</script></body></html>" }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok && data.ok === true, stdout: data.snapshot ? JSON.stringify(data.snapshot) : "", stderr: data.error || (data.consoleErrors || []).join("\n"), runtime: data.runtime, durationMs: data.durationMs };
}
