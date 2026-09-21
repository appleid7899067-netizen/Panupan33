import type { ReactNode } from "react";
import { CheckCircle2, LockKeyhole, LogIn, Loader2 } from "lucide-react";
import { usePuter } from "@/lib/puter-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const FREE_PUTER_MODELS = [
  "gpt-5.6-luna", "gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet", "claude-3-haiku",
  "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "qwen-2.5-coder",
  "qwen-2.5-72b", "deepseek-chat", "deepseek-coder", "llama-3.3-70b",
  "mistral-large", "mixtral-8x7b", "phi-4",
] as const;

export function PuterGate({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { ready, signedIn, user, signIn } = usePuter();
  if (!ready) return <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted"><Loader2 className="size-4 animate-spin" />กำลังตรวจสอบ Puter…</div>;
  if (signedIn) return <>{children}</>;

  return (
    <div className={`mx-auto flex max-w-2xl flex-col items-center justify-center rounded-3xl border border-cyan-300/15 bg-[#06111b] text-center shadow-[0_0_70px_rgba(0,200,255,.08)] ${compact ? "p-6" : "p-10"}`}>
      <div className="grid size-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300"><LockKeyhole className="size-7" /></div>
      <h2 className="mt-5 text-xl font-black text-white">เข้าสู่ระบบ Puter ก่อนใช้งาน</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">ต้องเข้าสู่ระบบ Puter เพื่อใช้โมเดลฟรีและฟีเจอร์ AI ของ Bossnu SlieLo</p>
      <Button className="mt-6 bg-cyan-300 text-slate-950 hover:bg-cyan-200" onClick={() => void signIn().catch((err: unknown) => toast.error(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ"))}>
        <LogIn className="size-4" /> เข้าสู่ระบบ Puter
      </Button>
    </div>
  );
}

export function PuterModelList() {
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{FREE_PUTER_MODELS.map((model) => <div key={model} className="flex items-center gap-2 rounded-xl border border-border bg-elevated/50 px-3 py-2 text-xs"><CheckCircle2 className="size-3.5 text-ok" /><span className="min-w-0 flex-1 truncate text-muted">{model}</span><span className="font-semibold text-ok">ฟรี</span></div>)}</div>;
}

export function PuterIdentity() {
  const { user } = usePuter();
  return <span className="text-xs text-muted">{user?.username || user?.email || "Puter"}</span>;
}
