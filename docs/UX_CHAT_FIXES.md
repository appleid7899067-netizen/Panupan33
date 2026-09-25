# Chat UI/UX fixes (Dark Mode audit)

Applied on branch `boss/super1-skills-usable` from the Meta-style chat review.

## Fixed

| Issue | Fix |
|-------|-----|
| Code block overflow / no wrap | `BossMarkdown` + `markdown-output`: **Wrap/Scroll** toggle, `break-all`, stronger **คัดลอก** button |
| Tool cards pile up | `BossLiveActivity`: **collapsible phase accordion** (auto-collapse when >3 steps) |
| Input vs Android gesture bar | Composer `pb-[max(1rem,env(safe-area-inset-bottom))]` |
| Host URL loud in screenshots | `ui-safe.ts` `maskInternalUrls` for display (copy still full text via buttons) |
| Weak tab/nav contrast | `app-shell`: active nav **text-fg + ring + underline primary** |
| Next-step friction | Suggestion chips above input: capabilities / game / summary / teach routine |

## Files

- `src/components/boss-markdown.tsx` (new)
- `src/components/markdown-output.tsx`
- `src/components/boss-live-activity.tsx`
- `src/components/app-shell.tsx`
- `src/lib/ui-safe.ts`
- `src/components/super-chat.tsx` — import `BossMarkdown` + safe-area + chips (see PR diff)

## Note on public API URL

`/api/capabilities` is intentionally public (judge/demo). Masking is for **chat display clutter / casual screenshots**, not access control. Real security remains auth on mutation tools + connector vault.
