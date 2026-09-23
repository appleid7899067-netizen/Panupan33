import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function FleetMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-9 w-9 sm:h-10 sm:w-10", className)}
      role="img"
      aria-label="Bossnu SlieLo"
    >
      <defs>
        <linearGradient id="bossnu-mark" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="0.5" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#e879f9" />
        </linearGradient>
        <filter id="bossnu-mark-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="20.5" fill="rgba(12,16,24,.72)" stroke="url(#bossnu-mark)" strokeOpacity=".28" />
      <path
        d="M16 33V15h9.5c5 0 8 2.5 8 6.2 0 2.2-1.2 3.9-3.2 4.8 2.5.7 4.1 2.5 4.1 5.1 0 4.4-3.5 6.9-9.2 6.9H16Zm5-13.5h4c2.1 0 3.3-.8 3.3-2.3 0-1.5-1.2-2.2-3.3-2.2H21v4.5Zm0 9.2h4.4c2.4 0 3.8-.9 3.8-2.7 0-1.8-1.4-2.6-3.8-2.6H21v5.3Z"
        fill="url(#bossnu-mark)"
        filter="url(#bossnu-mark-glow)"
        transform="translate(0 -2)"
      />
      <path d="M8 24c3.4-6.8 8.9-10.2 16.2-10.2 7.2 0 12.5 3.3 15.8 9.7" fill="none" stroke="url(#bossnu-mark)" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
      <circle cx="39.2" cy="23.7" r="1.7" fill="#7dd3fc" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className="group flex min-w-0 shrink items-center gap-2 text-fg no-underline"
      aria-label="Bossnu SlieLo home"
    >
      <span className="relative shrink-0 transition-transform duration-300 group-hover:scale-[1.04]">
        <span className="absolute inset-1 rounded-full bg-primary/10 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        <FleetMark className="relative text-primary" />
      </span>
      {!compact && (
        <span className="whitespace-nowrap text-base font-bold tracking-[-0.03em] sm:text-[1.35rem]">
          Bossnu{" "}
          <span className="bg-gradient-to-r from-sky-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            SlieLo
          </span>
        </span>
      )}
    </Link>
  );
}
