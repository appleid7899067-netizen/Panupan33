/**
 * Connector / Login vault
 * Stores references + metadata only. Secrets stay in env / Puter encrypted storage.
 * Agents receive connector ids — never plaintext passwords in prompts.
 */

export type ConnectorKind =
  | "github"
  | "puter"
  | "web_portal"
  | "email"
  | "crm"
  | "ads"
  | "custom";

export type ConnectorRecord = {
  id: string;
  kind: ConnectorKind;
  label: string;
  /** Opaque ref into secret store — not the secret itself */
  secretRef: string;
  scopes: string[];
  createdAt: number;
  lastUsedAt?: number;
  healthy?: boolean;
};

export type ConnectorVault = {
  connectors: ConnectorRecord[];
};

export function createConnectorVault(): ConnectorVault {
  return { connectors: [] };
}

export function registerConnector(
  vault: ConnectorVault,
  input: {
    kind: ConnectorKind;
    label: string;
    secretRef: string;
    scopes?: string[];
  },
): { vault: ConnectorVault; connector: ConnectorRecord } {
  if (!input.secretRef.startsWith("secret:") && !input.secretRef.startsWith("env:")) {
    throw new Error("secretRef must be secret:* or env:* — refuse raw credentials");
  }
  const connector: ConnectorRecord = {
    id: `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: input.kind,
    label: input.label.trim(),
    secretRef: input.secretRef,
    scopes: input.scopes ?? [],
    createdAt: Date.now(),
    healthy: true,
  };
  return { vault: { connectors: [...vault.connectors, connector] }, connector };
}

export function listConnectorsForPrompt(vault: ConnectorVault): string {
  if (!vault.connectors.length) return "(no connectors registered)";
  return vault.connectors
    .map((c) => `- ${c.id} · ${c.kind} · ${c.label} · scopes=${c.scopes.join(",") || "-"}`)
    .join("\n");
}

/** Redact anything that looks like a secret from model-visible text */
export function redactSecrets(text: string): string {
  return text
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*['"]?[^\s'"]+/gi, "$1=[REDACTED]")
    .replace(/\b(ghp|gho|github_pat|sk-)[a-zA-Z0-9_]{8,}/g, "[REDACTED]");
}
