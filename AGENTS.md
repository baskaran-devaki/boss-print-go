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
- Binding quotes share the physical-sheet conversion helper between customer totals and order submission; legacy min_pages/max_pages and RPC _pages fields represent sheets for binding only, avoiding divergent checkout prices.
- Customer totals use integer-paise arithmetic; orders are guest-created through one public server function that re-quotes pricing from the database and rejects the submit when the quoted total differs from the amount the customer paid. Orders, their files and customer details are admin-only (no anon table access); manual payment stays pending_verification until an admin verifies the receipt; Razorpay orders may be verified only after server signature/webhook verification and matching captured amount/currency/order ID — a UTR or screenshot never auto-approves payment.
- Customer uploads go straight from the browser to the private order-uploads bucket (anon insert-only policy); admins open files through short-lived signed URLs. The payment QR is stored inline as an image data URL in payment settings — no public storage bucket (the workspace blocks them).
- Keep one root auth-state subscriber; the public /admin sign-in surface conditionally exposes the existing dashboard only after a server role check, and every private data function separately verifies admin permissions.
- Customer entry is a guest identity, not verified authentication: server-issued HttpOnly random cookies identify the browser, only their hashes are persisted, and names/mobile never authorize access. Same-browser re-entry updates the existing customer and increments its login count.
- Persist guest session expiry in customers and enforce it on every active-session read; explicit logout nulls expiry, admin queries filter unexpired sessions, and the customer shell clears cached identity at expiry so open pages cannot retain expired login.
- Customer history is derived using the India-time calendar-month boundary on every read; this resets instantly without deleting admin orders or scheduling background work. Active orders remain available in Status across month boundaries.

- Razorpay checkout records are drafts until capture verification: filter unpaid gateway drafts out of admin lists, customer history/status and public tracking. Keep drafts internally for late webhook recovery; cancellation must reset the new-order form without saved-payment controls. Native Android checkout goes through the registered BossRazorpay bridge; never substitute a WebView checkout for UPI intent.

- First admin pickup stamps immutable picked_up_at in the database. Customer history/tracking and new signed file links expire 24 hours later. A separately authenticated scheduled Storage API cleanup deletes uploads/screenshots and clears references only after successful deletion, preserving financial rows. Do not calculate retention from order creation or delete Storage metadata through SQL.

- Online-order platform fee is a merchant fee of 250 basis points on print-plus-binding subtotal. Use the shared integer-paise calculation on client and server; persist subtotal/rate/fee snapshots, charge/verify the stored inclusive total, and never recompute historical payments with the current fee rate.
