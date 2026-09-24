export function contentHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash) ^ value.charCodeAt(i);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))];
}
