const TEXT_EXT =
  /\.(md|txt|json|js|jsx|ts|tsx|css|html|xml|yml|yaml|csv|py|go|rs|java|sql|env|vue|svelte|mjs|cjs)$/i;
const MAX_FILES = 8;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_ZIP_CHARS = 60_000;
const MAX_ZIP_ENTRIES = 50;

export type AttachmentPreview = {
  file: File;
  url?: string;
};

export function clampAttachments(files: File[]) {
  return files
    .filter((file) => file.size <= MAX_FILE_BYTES)
    .slice(0, MAX_FILES);
}

export function attachmentLimitMessage(file: File) {
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 4 MB and was skipped.`;
  return null;
}

async function extractZip(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const files: string[] = [];
  let totalChars = 0;

  for (let i = 0; i + 46 <= bytes.length && files.length < MAX_ZIP_ENTRIES; i += 1) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    const method = view.getUint16(i + 10, true);
    const compressedSize = view.getUint32(i + 20, true);
    const nameLen = view.getUint16(i + 28, true);
    const extraLen = view.getUint16(i + 30, true);
    const commentLen = view.getUint16(i + 32, true);
    const localOffset = view.getUint32(i + 42, true);
    const name = decoder.decode(bytes.slice(i + 46, i + 46 + nameLen));
    i += 45 + nameLen + extraLen + commentLen;
    if (!name || name.endsWith("/") || /(^|\/)(node_modules|\.git|dist|build)(\/|$)/i.test(name)) continue;
    if (!TEXT_EXT.test(name)) continue;
    if (compressedSize > 2_000_000 || localOffset + 30 > bytes.length) continue;
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let content = "";
    try {
      if (method === 0) content = decoder.decode(compressed);
      else if (method === 8 && "DecompressionStream" in globalThis) {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        content = decoder.decode(await new Response(stream).arrayBuffer());
      }
    } catch {
      content = "";
    }
    if (!content) continue;
    const remaining = MAX_ZIP_CHARS - totalChars;
    if (remaining <= 0) break;
    const clipped = content.slice(0, remaining);
    files.push(`\n### ${name}\n${clipped}`);
    totalChars += clipped.length;
  }
  if (files.length) {
    return `ZIP extracted text files (${files.length}):${files.join("")}${
      totalChars >= MAX_ZIP_CHARS ? "\n[ZIP content truncated at 60,000 characters]" : ""
    }`;
  }
  return "ZIP attached, but no readable text/code entries could be extracted in this browser.";
}

export async function describeAttachment(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".zip")) return extractZip(file);
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) {
    const text = await file.text();
    return `File content: ${text.slice(0, MAX_ZIP_CHARS)}${text.length > MAX_ZIP_CHARS ? "\n[truncated]" : ""}`;
  }
  if (file.type.startsWith("image/")) return `Image attachment: ${file.name} (${file.type}, ${file.size} bytes)`;
  return `Binary attachment: ${file.name} (${file.type || "unknown"})`;
}

export function toSandboxFiles(files: File[]): Promise<Array<{ path: string; contents: string }>> {
  return Promise.all(
    files
      .filter((file) => file.type.startsWith("text/") || TEXT_EXT.test(file.name))
      .slice(0, MAX_FILES)
      .map(async (file) => ({
        path: file.name.replace(/^\/+/, "").replace(/\.\./g, ""),
        contents: (await file.text()).slice(0, 200_000),
      })),
  );
}
