import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function FleetMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 52" className={cn("h-8 w-10 sm:h-10 sm:w-14", className)} aria-hidden="true">
      <path d="M25 10 7 3 17 17 4 15 21 28" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 10 65 3 55 17 68 15 51 28" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28 7h13c8 0 13 5 13 12s-5 12-13 12H28V7Zm0 24v13h13c8 0 13-4 13-11 0-1-.1-2-.4-3" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex min-w-0 shrink items-center gap-1.5 text-fg no-underline" aria-label="Bossnu SlieLo home">
      <FleetMark className="shrink-0 text-primary" />
      {!compact && (
        <span className="whitespace-nowrap text-base font-bold tracking-tight sm:text-2xl">
          Bossnu <span className="text-primary">SlieLo</span>
        </span>
      )}
    </Link>
  );
}
