import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Loader2, LogIn, LogOut, Menu, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { APP_NAV } from "@/lib/catalog";
import { usePuter } from "@/lib/puter-context";
import { getBrowserIdentity } from "@/lib/user-identity";

function PuterChip() {
  const { ready, signedIn, user, signIn, signOut } = usePuter();
  if (!ready) {
    return (
      <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-elevated px-2.5 text-xs text-muted shadow-[var(--shadow-border)]">
        <Loader2 className="size-3.5 animate-spin" />
        Puter
      </span>
    );
  }
  if (signedIn) {
    const label = user?.username || user?.email || "Puter";
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex h-9 max-w-36 items-center gap-1.5 rounded-full bg-elevated px-2.5 text-xs text-muted shadow-[var(--shadow-border)] hover:text-fg"
        title="Sign out of Puter"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-ok" />
        <span className="truncate">{label}</span>
        <LogOut className="size-3.5 shrink-0" />
      </button>
    );
  }
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        void signIn().catch((err: unknown) =>
          toast.error(err instanceof Error ? err.message : "Sign-in failed. Allow popups and retry."),
        )
      }
    >
      <LogIn className="size-4" />
      <span className="hidden sm:inline">Sign in with Puter</span>
      <span className="sm:hidden">Puter</span>
    </Button>
  );
}

function IdentityChip() {
  const identity = getBrowserIdentity();
  return (
    <span className="hidden lg:inline-flex h-9 items-center gap-2 rounded-full bg-elevated px-3 text-[10px] text-muted shadow-[var(--shadow-border)]" title="รหัสผู้ใช้ของเบราว์เซอร์นี้">
      <span className="size-1.5 rounded-full bg-primary" />
      USER {identity.shortId}
    </span>
  );
}

function navClass(active: boolean) {
  return active
    ? "text-fg bg-elevated font-medium ring-1 ring-border shadow-sm"
    : "text-muted hover:text-fg hover:bg-elevated/50";
}

function Header() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0 md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-4 pt-12">
            <Logo />
            <nav className="mt-6 flex flex-col gap-1">
              {APP_NAV.map((item) => {
                const active = path.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      "boss-nav-item flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm " + navClass(active)
                    }
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    {active && <span className="ml-auto h-0.5 w-4 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary">
          {APP_NAV.map((item) => {
            const active = path.startsWith(item.to);
            return (
              <Button key={item.to} variant="ghost" size="sm" asChild>
                <Link
                  to={item.to}
                  className={"boss-nav-item relative " + navClass(active)}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary" aria-hidden />
                  )}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <IdentityChip />
          <PuterChip />
          <Button size="icon" className="size-11 shrink-0 boss-header-action" asChild>
            <Link to="/chat" aria-label="เปิดแชท">
              <MessageSquarePlus className="size-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isChat = path === "/chat";
  return (
    <div className={"flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-fg " + (isChat ? "boss-chat-shell" : "")}>
      {!isChat && <Header />}
      <div className={isChat ? "min-h-0 flex-1 overflow-hidden" : "flex-1 min-h-0 overflow-auto"}>{children}</div>
      {!isChat && <SiteFooter />}
    </div>
  );
}
