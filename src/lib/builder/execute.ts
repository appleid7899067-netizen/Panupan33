/**
 * Execute builder tools via Puter FS / hosting when signed in.
 */

import { ensurePuter } from "@/lib/puter";

function normalizePath(path: string, root = "/BossBuilder/current"): string {
  const p = path.trim();
  if (p.startsWith("/")) return p;
  return `${root.replace(/\/$/, "")}/${p.replace(/^\/+/, "")}`;
}

async function puterFs(): Promise<any> {
  await ensurePuter();
  const puter = (globalThis as any).puter;
  if (!puter?.fs) throw new Error("Puter FS unavailable — sign in to Puter first.");
  return puter.fs;
}

export async function executeBuilderTool(
  name: string,
  args: Record<string, unknown>,
  opts?: { projectRoot?: string; authToken?: string },
): Promise<unknown> {
  const root = opts?.projectRoot ?? "/BossBuilder/current";

  if (name === "builder_suggest_next_steps") {
    const suggestions = Array.isArray(args.suggestions) ? args.suggestions : [];
    return { ok: true, suggestions: suggestions.slice(0, 5) };
  }
  if (name === "builder_clarify") {
    return { ok: true, questions: args.questions ?? [] };
  }
  if (name === "builder_todo") {
    return { ok: true, items: args.items ?? [] };
  }
  if (name === "builder_update_preview") {
    return {
      ok: true,
      preview: true,
      entry: String(args.entry ?? "index.html"),
      note: args.note ? String(args.note) : "Preview refresh requested",
      bust: Date.now(),
    };
  }

  if (name === "builder_publish_site") {
    const subdomain = String(args.subdomain ?? "").trim();
    const rootDir = normalizePath(String(args.rootDir ?? root), root);
    if (!subdomain) throw new Error("subdomain required");
    await ensurePuter();
    const puter = (globalThis as any).puter;
    if (!puter?.hosting?.create) {
      // Fallback: use puter_hosting_create semantics via FS only message
      return {
        ok: false,
        error: "Puter hosting API unavailable in this session",
        hint: "Sign in to Puter and retry, or use puter_hosting_create",
        subdomain,
        rootDir,
      };
    }
    const site = await puter.hosting.create(subdomain, rootDir);
    return { ok: true, subdomain, rootDir, site, url: site?.url ?? site?.subdomain ?? `https://${subdomain}.puter.site` };
  }

  const fs = await puterFs();

  if (name === "builder_write") {
    const path = normalizePath(String(args.path ?? ""), root);
    const content = String(args.content ?? "");
    await fs.write(path, content);
    return { ok: true, path, bytes: content.length };
  }

  if (name === "builder_read") {
    const path = normalizePath(String(args.path ?? ""), root);
    const data = await fs.read(path);
    const text = typeof data?.text === "function" ? await data.text() : String(data ?? "");
    return { ok: true, path, content: text };
  }

  if (name === "builder_readdir") {
    const path = normalizePath(String(args.path ?? root), root);
    const entries = await fs.readdir(path);
    const list = Array.isArray(entries)
      ? entries.map((e: any) => ({
          name: e.name ?? e.path ?? String(e),
          is_dir: Boolean(e.is_dir ?? e.isDirectory),
        }))
      : [];
    return { ok: true, path, entries: list };
  }

  if (name === "builder_edit") {
    const path = normalizePath(String(args.path ?? ""), root);
    const oldContent = String(args.old_content ?? "");
    const newContent = String(args.new_content ?? "");
    if (!oldContent) throw new Error("old_content cannot be empty");
    if (oldContent === newContent) throw new Error("old_content and new_content are identical");
    const data = await fs.read(path);
    const text = typeof data?.text === "function" ? await data.text() : String(data ?? "");
    if (!text.includes(oldContent)) throw new Error("old_content not found in file (exact match required)");
    const next = text.replace(oldContent, newContent);
    await fs.write(path, next);
    return { ok: true, path, replaced: 1 };
  }

  if (name === "builder_multi_edit") {
    const path = normalizePath(String(args.path ?? ""), root);
    const edits = Array.isArray(args.edits) ? (args.edits as Array<{ old_content?: string; new_content?: string }>) : [];
    const data = await fs.read(path);
    let text = typeof data?.text === "function" ? await data.text() : String(data ?? "");
    let count = 0;
    for (const ed of edits) {
      const o = String(ed.old_content ?? "");
      const n = String(ed.new_content ?? "");
      if (!o || !text.includes(o)) continue;
      text = text.replace(o, n);
      count += 1;
    }
    await fs.write(path, text);
    return { ok: true, path, replaced: count };
  }

  if (name === "builder_delete") {
    const path = normalizePath(String(args.path ?? ""), root);
    await fs.delete(path);
    return { ok: true, path, deleted: true };
  }

  if (name === "builder_mkdir") {
    const path = normalizePath(String(args.path ?? ""), root);
    if (typeof fs.mkdir === "function") await fs.mkdir(path, { recurse: true });
    else await fs.write(`${path}/.keep`, "");
    return { ok: true, path };
  }

  if (name === "builder_search_files") {
    const query = String(args.query ?? "").trim();
    const base = normalizePath(String(args.path ?? root), root);
    const max = Math.min(50, Math.max(1, Number(args.max_results ?? 20)));
    if (!query) throw new Error("query required");
    const hits: Array<{ path: string; line: number; snippet: string }> = [];
    async function walk(dir: string) {
      if (hits.length >= max) return;
      let entries: any[] = [];
      try {
        entries = await fs.readdir(dir);
      } catch {
        return;
      }
      if (!Array.isArray(entries)) return;
      for (const e of entries) {
        if (hits.length >= max) break;
        const name = e.name ?? "";
        const isDir = Boolean(e.is_dir ?? e.isDirectory);
        const full = `${dir.replace(/\/$/, "")}/${name}`;
        if (isDir) await walk(full);
        else {
          try {
            const data = await fs.read(full);
            const text = typeof data?.text === "function" ? await data.text() : String(data ?? "");
            const lines = text.split("\n");
            lines.forEach((line: string, i: number) => {
              if (hits.length >= max) return;
              if (line.toLowerCase().includes(query.toLowerCase())) {
                hits.push({ path: full, line: i + 1, snippet: line.slice(0, 200) });
              }
            });
          } catch {
            /* skip unreadable */
          }
        }
      }
    }
    await walk(base);
    return { ok: true, query, hits };
  }

  throw new Error(`Unknown builder tool: ${name}`);
}
