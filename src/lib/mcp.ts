import { z } from "zod";

export type MCPTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

export type MCPServer = {
  name: string;
  url: string;
  headers?: Record<string, string>;
};

const serverSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().refine((value) => value.startsWith("https://"), "MCP server must use HTTPS"),
  headers: z.record(z.string(), z.string()).optional(),
});

function serversFromEnv(): MCPServer[] {
  const raw = process.env.BOSSNU_MCP_SERVERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return z.array(serverSchema).parse(parsed);
  } catch {
    return [];
  }
}

export function getMCPServers(): MCPServer[] {
  return serversFromEnv();
}

async function rpc(server: MCPServer, method: string, params: Record<string, unknown> = {}) {
  const response = await fetch(server.url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...server.headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`MCP ${server.name} returned HTTP ${response.status}: ${text.slice(0, 240)}`);
  const result = JSON.parse(text) as { result?: unknown; error?: { message?: string } };
  if (result.error) throw new Error(`MCP ${server.name}: ${result.error.message ?? "request failed"}`);
  return result.result;
}

export async function listMCPTools(server: MCPServer): Promise<MCPTool[]> {
  const result = await rpc(server, "tools/list");
  const tools = (result as { tools?: unknown } | undefined)?.tools;
  return Array.isArray(tools) ? tools.filter((tool): tool is MCPTool => !!tool && typeof tool === "object" && typeof (tool as MCPTool).name === "string") : [];
}

export async function callMCPTool(server: MCPServer, name: string, arguments_: Record<string, unknown>) {
  return rpc(server, "tools/call", { name, arguments: arguments_ });
}

export async function discoverMCPTools() {
  const servers = getMCPServers();
  const discovered = await Promise.all(servers.map(async (server) => {
    try {
      return { server, tools: await listMCPTools(server) };
    } catch (error) {
      return { server, tools: [], error: error instanceof Error ? error.message : String(error) };
    }
  }));
  return discovered;
}
