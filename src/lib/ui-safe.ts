export function maskUrlForDisplay(value: string): string {
  return value.replace(/https?:\/\/([^\s/]+)([^\s]*)/gi, (_match, host: string, rest: string) => {
    const compact = host.length > 32 ? host.slice(0, 29) + "…" : host;
    return "https://" + compact + rest;
  });
}
