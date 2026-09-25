export type ConnectorRef = { id: string; kind: "secret" | "env"; value: string };

const vault = new Map<string, ConnectorRef>();

export function registerConnector(id: string, kind: "secret" | "env", value: string): ConnectorRef {
  if (kind !== "secret" && kind !== "env") throw new Error("Unsupported connector kind");
  const ref = { id, kind, value };
  vault.set(id, ref);
  return { ...ref, value: "[REDACTED]" };
}

export function getConnector(id: string): ConnectorRef | null {
  return vault.get(id) ?? null;
}

export function redactConnectors(text: string): string {
  let out = text;
  for (const ref of vault.values()) if (ref.value) out = out.split(ref.value).join("[REDACTED]");
  return out;
}
