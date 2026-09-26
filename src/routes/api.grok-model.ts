import { createFileRoute } from "@tanstack/react-router";
import { runModelGateway, type GatewayToolDef } from "@/lib/model-gateway.server";

function tokenFrom(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

export const Route = createFileRoute("/api/grok-model")({
  server: { handlers: {
    GET: async ({ request }) => {
      if (!tokenFrom(request)) return Response.json({ data: [] }, { status: 401 });
      return Response.json({ object: "list", data: [{ id: "puter", object: "model", owned_by: "puter" }] });
    },
    POST: async ({ request }) => {
      const token = tokenFrom(request);
      if (!token) return Response.json({ error: { message: "Puter authentication required" } }, { status: 401 });
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const messages = Array.isArray(body.messages) ? body.messages as Record<string, unknown>[] : [];
      const tools = Array.isArray(body.tools) ? body.tools as GatewayToolDef[] : [];
      const requested = typeof body.model === "string" && body.model !== "puter" ? body.model : undefined;
      const result = await runModelGateway({
        messages,
        tools,
        requestedModel: requested,
        puterToken: token,
        maxAttempts: 4,
      });
      if (!result.ok) return Response.json({ error: { message: result.error } }, { status: 503 });
      const toolCalls = result.result.toolCalls;
      const message: Record<string, unknown> = {
        role: "assistant",
        content: result.result.text || null,
      };
      if (toolCalls.length) {
        message.tool_calls = toolCalls.map((call, index) => ({
          id: call.id || `puter_call_${index}`,
          type: "function",
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        }));
      }
      return Response.json({
        id: `puter-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: result.result.model,
        choices: [{ index: 0, message, finish_reason: toolCalls.length ? "tool_calls" : "stop" }],
      });
    },
  }},
});
