import { ensurePuter } from "@/lib/puter";

export type LivePuterModel = {
  id: string;
  provider?: string;
  name?: string;
};

function flattenModels(value: unknown): LivePuterModel[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" && item.trim()) return [{ id: item.trim(), name: item.trim() }];
      if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const id = String(rec.id ?? rec.model ?? rec.slug ?? "").trim();
        if (!id) return [];
        return [
          {
            id,
            name: String(rec.name ?? rec.title ?? id),
            provider: rec.provider ? String(rec.provider) : undefined,
          },
        ];
      }
      return [];
    });
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return flattenModels(rec.models ?? rec.data ?? rec.items ?? []);
  }
  return [];
}

export async function listLivePuterModels(): Promise<LivePuterModel[]> {
  const puter = await ensurePuter();
  if (typeof puter.ai.listModels !== "function") return [];
  const raw = await puter.ai.listModels();
  return flattenModels(raw);
}
