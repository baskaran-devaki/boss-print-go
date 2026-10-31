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
- Customer totals use integer-paise arithmetic; orders are guest-created through one public server function that re-quotes pricing from the database and rejects the submit when the quoted total differs from the amount the customer paid. Orders, their files and customer details are admin-only (no anon table access); payment stays pending_verification until an admin verifies the receipt — a UTR or screenshot never auto-approves payment.
- Customer uploads go straight from the browser to the private order-uploads bucket (anon insert-only policy); admins open files through short-lived signed URLs. The payment QR is stored inline as an image data URL in payment settings — no public storage bucket (the workspace blocks them).
- Keep one root auth-state subscriber; the public /admin sign-in surface conditionally exposes the existing dashboard only after a server role check, and every private data function separately verifies admin permissions.
