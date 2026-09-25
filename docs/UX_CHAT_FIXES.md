# UX Chat Fixes

Implemented on main after the chat UI audit.

- Code blocks support Wrap/Scroll and clear Copy controls.
- Long code uses break-all when wrapped so mobile chat does not overflow.
- Live activity is grouped by workflow phase; phases with more than three steps collapse by default unless active.
- Composer includes Android safe-area bottom padding.
- Displayed URLs mask long hosts while copy actions keep the original message/code.
- Active desktop navigation uses stronger foreground contrast, ring, and primary underline.
- Suggestion chips sit above the composer for common GitHub/Boss actions.

Security note: /api/capabilities remains public for judge/discovery purposes. UI masking is presentation-only and is not an ACL. Mutating actions still depend on GitHub authentication and connector-vault handling.