<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Customer-selected files stay in browser memory; detect pages in an event-triggered module with PDF.js and its bundled worker, so document parsing never runs during SSR or sends files to a server.
- Pricing mutations use authenticated server functions plus an independently protected user_roles table and admin-only pricing RLS; customers read a narrow public pricing RPC rather than the admin table.
- Customer totals use integer-paise arithmetic and a fresh database quote before the existing demo checkout transition; no real payment or order storage exists, and any future order insert must calculate its amount atomically from current pricing rather than accept client amounts.
- Keep one root auth-state subscriber; the public /admin sign-in surface conditionally exposes the existing dashboard only after a server role check, and every private data function separately verifies admin permissions.
