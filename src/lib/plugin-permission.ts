export type PluginPermissionMode = "always-ask";

export type PluginPermissionRequest = {
  pluginName: string;
  toolName: string;
  endpoint: string;
  method: string;
  args: Record<string, unknown>;
};

export type PluginPermissionDecision = {
  allowed: boolean;
  reason: string;
};

type AskHandler = (request: PluginPermissionRequest) => Promise<boolean>;

/** System policy is Always Ask. There is no silent allow. */
export const PLUGIN_PERMISSION_MODE: PluginPermissionMode = "always-ask";

const PLUGIN_DECISION_EVENT = "bosses:plugin-permission";

let askHandler: AskHandler | null = null;

export function setPluginPermissionAskHandler(handler: AskHandler | null) {
  askHandler = handler;
}

export function isHttpsEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function requestPluginPermission(
  request: PluginPermissionRequest,
): Promise<PluginPermissionDecision> {
  if (!isHttpsEndpoint(request.endpoint)) {
    return { allowed: false, reason: "Plugin endpoints must use HTTPS." };
  }
  if (typeof window === "undefined") {
    return { allowed: false, reason: "Plugin actions require an in-app permission gate." };
  }
  if (!askHandler) {
    return {
      allowed: false,
      reason: "Plugin permission gate is not mounted. Always Ask blocked this call.",
    };
  }
  const allowed = await askHandler(request);
  try {
    window.dispatchEvent(new CustomEvent(PLUGIN_DECISION_EVENT, { detail: { ...request, allowed } }));
  } catch {
    /* ignore */
  }
  return allowed
    ? { allowed: true, reason: "User approved this plugin action." }
    : { allowed: false, reason: "User denied this plugin action (Always Ask)." };
}
