import { APP_NAME, FOOTER_LINE, MOTTO_TH, PUTER_DOCS } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{MOTTO_TH}</p>
          <p className="mt-1 text-xs text-subtle">{APP_NAME}. Models run through Puter unless you connect OpenRouter.</p>
        </div>
        <a className="text-xs text-muted hover:text-fg" href={PUTER_DOCS} target="_blank" rel="noreferrer">
          developer.puter.com
        </a>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-subtle">{FOOTER_LINE}</p>
      </div>
    </footer>
  );
}
