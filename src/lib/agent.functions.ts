import { chatWithPuter } from "@/lib/puter";

export type AgentRunResult = {
  ok: boolean;
  text: string;
  verified?: boolean;
};

type AgentData = {
  prompt: string;
  model?: string;
  context?: string;
  authToken?: string;
  githubToken?: string;
  maxIterations?: number;
  threadId?: string;
  agentSettings?: unknown;
};

export async function* runAgentStream(input: { data: AgentData }): AsyncGenerator<
  { type: "step"; step?: { phase: string; detail: string } } | { type: "done"; result: AgentRunResult },
  void,
  unknown
> {
  yield { type: "step", step: { phase: "observe", detail: "Puter model พร้อมทำงาน" } };
  yield { type: "step", step: { phase: "act", detail: "กำลังประมวลผลคำสั่ง" } };
  const context = input.data.context ? "\n\nบริบท:\n" + input.data.context : "";
  const result = await chatWithPuter({
    model: input.data.model,
    messages: [
      {
        role: "system",
        content:
          "You are Boss Agent. Complete the user's request using only capabilities actually available in this web session. Do not claim that files, GitHub, shell, deploys, or other external tools were changed unless verified evidence is present. Reply in Thai.",
      },
      { role: "user", content: input.data.prompt + context },
    ],
  });
  if (!result.ok) throw new Error(result.error);
  yield { type: "step", step: { phase: "verify", detail: "ตรวจสอบผลลัพธ์ของรอบสนทนาแล้ว" } };
  yield { type: "done", result: { ok: true, text: result.text, verified: false } };
}

export async function runAgent(input: { data: AgentData }): Promise<AgentRunResult> {
  let final: AgentRunResult = { ok: false, text: "", verified: false };
  for await (const event of runAgentStream(input)) {
    if (event.type === "done") final = event.result;
  }
  return final;
}

export async function runAgentSandbox(input: { data: { language: string; code: string } }) {
  const response = await fetch("/api/sandbox", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      html: input.data.language.toLowerCase() === "html"
        ? input.data.code
        : "<!doctype html><html><body><pre id='out'></pre><script>" +
          input.data.code.replace(/<\/script/gi, "<\\/script") +
          "</script></body></html>",
    }),
  });
  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok && data.ok === true,
    stdout: data.snapshot ? JSON.stringify(data.snapshot) : "",
    stderr: data.error || (data.consoleErrors || []).join("\n"),
    runtime: data.runtime,
    durationMs: data.durationMs,
  };
}
