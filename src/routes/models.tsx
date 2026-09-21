import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { API_KEY_CHANGED_EVENT, getCachedOpenRouterModels, hasOpenRouterKey } from "@/lib/provider-keys";
import { listLivePuterModels, type LivePuterModel } from "@/lib/puter-models";
import { usePuter } from "@/lib/puter-context";

export const Route = createFileRoute("/models")({ component: ModelsPage });

function ModelsPage() {
  const { signedIn } = usePuter();
  const [puterModels, setPuterModels] = useState<LivePuterModel[]>([]);
  const [puterError, setPuterError] = useState<string | null>(null);
  const [openRouterOn, setOpenRouterOn] = useState(() => hasOpenRouterKey());
  const [openRouterCount, setOpenRouterCount] = useState(() => getCachedOpenRouterModels().length);

  useEffect(() => {
    const sync = () => {
      setOpenRouterOn(hasOpenRouterKey());
      setOpenRouterCount(getCachedOpenRouterModels().length);
    };
    window.addEventListener(API_KEY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(API_KEY_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    listLivePuterModels()
      .then((models) => {
        if (!cancelled) setPuterModels(models);
      })
      .catch((err: unknown) => {
        if (!cancelled) setPuterError(err instanceof Error ? err.message : "Puter catalog unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-medium tracking-tight">Models</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          ไม่มีตัวเลือกหลอก. รายการ Puter มาจาก puter.ai.listModels() หลัง Sign in.
          รายการ OpenRouter มาจาก OpenRouter API หลังใส่ key — ไม่ใช่โมเดลของ Puter
        </p>

        <section className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="text-base font-medium">Puter</h2>
          {!signedIn ? (
            <p className="mt-2 text-sm text-muted">Sign in with Puter เพื่อดึงรายการจริง</p>
          ) : puterError ? (
            <p className="mt-2 text-sm text-danger">{puterError}</p>
          ) : puterModels.length === 0 ? (
            <p className="mt-2 text-sm text-muted">กำลังดึง catalog จาก Puter…</p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-1 overflow-auto text-sm text-muted">
              {puterModels.slice(0, 80).map((model) => (
                <li key={model.id} className="font-mono text-xs">
                  {model.id}
                  {model.provider ? <span className="text-subtle"> · {model.provider}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="text-base font-medium">OpenRouter</h2>
          {openRouterOn ? (
            <p className="mt-2 text-sm text-ok">Verified · {openRouterCount} chat models จาก OpenRouter</p>
          ) : (
            <p className="mt-2 text-sm text-muted">ยังไม่ได้เชื่อม OpenRouter จึงยังไม่มีรายการโมเดลให้เลือก</p>
          )}
          <Button className="mt-4" variant="secondary" asChild>
            <Link to="/plugins">ไปหน้า Plugins เพื่อใส่ key</Link>
          </Button>
        </section>
      </main>
    </AppShell>
  );
}
