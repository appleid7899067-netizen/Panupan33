/**
 * UI safety helpers — reduce accidental secret/host leaks in chat surfaces.
 * Public capability API is intentional; still avoid raw long URLs dominating UI.
 */

const INTERNAL_HOSTS = [
  "panupanboss.onrender.com",
  "panupan22.vercel.app",
  "panupan33.vercel.app",
];

/** Replace known internal hosts with short labels for display (not for copy). */
export function maskInternalUrls(text: string, mode: "display" | "copy" = "display"): string {
  if (mode === "copy") return text;
  let out = text;
  for (const host of INTERNAL_HOSTS) {
    out = out.replaceAll(`https://${host}`, `[host:${host.split(".")[0]}]`);
    out = out.replaceAll(`http://${host}`, `[host:${host.split(".")[0]}]`);
  }
  // Truncate very long query strings in any URL for display
  out = out.replace(
    /(https?:\/\/[^\s]{80,})/g,
    (m) => (m.length > 96 ? `${m.slice(0, 72)}…` : m),
  );
  return out;
}

export function softWrapClass(enabled: boolean): string {
  return enabled ? "whitespace-pre-wrap break-all" : "overflow-x-auto whitespace-pre";
}
