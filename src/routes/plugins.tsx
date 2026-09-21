import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGithubPat, setGithubPat } from "@/lib/github-pat";
import { PLUGIN_PERMISSION_MODE } from "@/lib/plugin-permission";
import {
  API_KEY_CHANGED_EVENT,
  clearActiveApiKey,
  connectApiKey,
  getCachedOpenRouterModels,
  hasOpenRouterKey,
} from "@/lib/provider-keys";
import { usePuter } from "@/lib/puter-context";

export const Route = createFileRoute("/plugins")({ component: PluginsPage });

function PluginsPage() {
  const { signedIn, user, signIn, signOut } = usePuter();
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterOn, setOpenRouterOn] = useState(() => hasOpenRouterKey());
  const [modelCount, setModelCount] = useState(() => getCachedOpenRouterModels().length);
  const [githubToken, setGithubToken] = useState("");
  const [githubOn, setGithubOn] = useState(() => Boolean(getGithubPat()));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => {
      setOpenRouterOn(hasOpenRouterKey());
      setModelCount(getCachedOpenRouterModels().length);
    };
    window.addEventListener(API_KEY_CHANGED_EVENT, sync);
    return () => window.removeEventListener(API_KEY_CHANGED_EVENT, sync);
  }, []);

  async function connectOpenRouter() {
    setBusy(true);
    try {
      const result = await connectApiKey(openRouterKey);
      setOpenRouterKey("");
      toast.success(`OpenRouter connected · ${result.models.length} chat models`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OpenRouter connect failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-medium tracking-tight">Plugins และ keys</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          นโยบายสิทธิ์ระดับระบบคือ <span className="text-fg">{PLUGIN_PERMISSION_MODE}</span>.
          Boss จะถามก่อนเรียกปลั๊กอิน ไม่เรียก endpoint เงียบ ๆ
        </p>

        <section className="mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="text-base font-medium">Puter</h2>
          <p className="mt-1 text-sm text-muted">เส้นทางหลัก: puter.ai.chat() หลังตรวจ session จริงด้วย getUser()</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {signedIn ? (
              <>
                <p className="text-sm">{user?.username || user?.email || "Signed in"}</p>
                <Button variant="secondary" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button onClick={() => void signIn().catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Sign-in failed"))}>
                Sign in with Puter
              </Button>
            )}
          </div>
        </section>

        <section className="mt-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="text-base font-medium">OpenRouter</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            ใส่ key แล้ว Boss จะเรียก OpenRouter โดยตรง แล้วดึงโมเดลจาก OpenRouter catalog.
            ไม่ใช่โมเดลของ Puter และจะไม่แสดงตัวเลือกจนกว่า catalog จะตอบจริง
          </p>
          {openRouterOn ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-ok">Connected · {modelCount} chat models verified</p>
              <Button
                variant="secondary"
                onClick={() => {
                  clearActiveApiKey();
                  toast.success("OpenRouter key cleared");
                }}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void connectOpenRouter();
              }}
            >
              <Label htmlFor="or-key">OpenRouter API key</Label>
              <Input
                id="or-key"
                type="password"
                autoComplete="off"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-..."
              />
              <div>
                <Button type="submit" disabled={busy || !openRouterKey.trim()}>
                  Verify and connect
                </Button>
              </div>
            </form>
          )}
        </section>

        <section className="mt-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="text-base font-medium">GitHub token</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            สำหรับเขียนไฟล์, PR, Issue, และรอ CI เมื่อยังไม่ได้ติดตั้ง GitHub App. Token อยู่ใน session ของเบราว์เซอร์นี้เท่านั้น
          </p>
          {githubOn ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-ok">GitHub token connected</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setGithubPat(null);
                  setGithubOn(false);
                  toast.success("GitHub token cleared");
                }}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <form
              className="mt-4 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!githubToken.trim()) return;
                setGithubPat(githubToken);
                setGithubToken("");
                setGithubOn(true);
                toast.success("GitHub token saved in this session");
              }}
            >
              <Label htmlFor="gh-key">Personal access token</Label>
              <Input
                id="gh-key"
                type="password"
                autoComplete="off"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
              />
              <div>
                <Button type="submit" disabled={!githubToken.trim()}>
                  Save for this session
                </Button>
              </div>
            </form>
          )}
        </section>
      </main>
    </AppShell>
  );
}
