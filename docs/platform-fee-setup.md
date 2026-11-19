# 2.5% BOSS PrintGo online-order platform fee

Baseline: GitHub main dfb392b. Code is prepared locally; no live database or deployment was changed here.

## Behaviour

For NEW Razorpay checkout orders, a merchant platform fee of 2.5% is added to the print-plus-binding subtotal. Fee calculation uses integer paise and rounds the fee once to the nearest paise. The customer sees Subtotal, Platform fee (2.5%), and Total before payment. Example: ₹100 subtotal + ₹2.50 platform fee = ₹102.50 payable. ₹100 print + ₹20 binding = ₹120 subtotal + ₹3 fee = ₹123 payable.

The server re-quotes print/binding, recomputes the fee using its fixed 250-basis-point rule, rejects a mismatched expected total, stores the snapshot, and sends the inclusive amount to Razorpay. Callback/webhook capture verification compares against that stored inclusive total. Admin order details and the successful-payment confirmation show the stored breakdown. Customer history/tracking already display total_amount and therefore show the inclusive total without changing their existing access/expiry rules.

Historical orders and pending checkouts keep their original totals/rate snapshots. No fee is retrospectively charged. The older manual receipt endpoint remains fee-free for compatibility; the current customer checkout uses Razorpay. Existing cancellation, paid-only admin visibility, pickup cleanup and login-only policy link behaviour are preserved.

This is a BOSS PrintGo fee, not a statement of Razorpay's exact fee. It applies immediately to new online orders even during Razorpay's fee-free welcome offer. Terms explain the fee; full eligible refunds include it and an unfulfilled partial service includes the corresponding proportion. Refunds remain manual owner actions in Razorpay.

Keep Razorpay's fee bearer set to the merchant. Do not also enable Razorpay Customer Fee Bearer/Convenience Fee on top of this app charge; that could add a second charge and change the gateway total. This change does not alter the Razorpay account setting. Gateway settlement charges continue to apply according to your own account pricing, calculated on the captured amount; the 2.5% app fee is not a guarantee that the net bank credit equals the printing subtotal.

## Apply

1. Save boss-printgo-platform-fee.patch into Downloads. At the project root:

```powershell
git apply --check "$HOME\Downloads\boss-printgo-platform-fee.patch"
# Only if check succeeds:
git apply "$HOME\Downloads\boss-printgo-platform-fee.patch"
npm run build
```

2. BEFORE deploying the new code, run drizzle/migrations/0012_order_platform_fee.sql in your own Supabase SQL Editor. It adds subtotal_amount, platform_fee_amount and platform_fee_rate_bps. Old orders are backfilled with their existing subtotal and zero fee; their total_amount is not changed. Old deployment instances can still finish during rollout.
3. Commit the targeted files and push normally:

```powershell
git add AGENTS.md docs/platform-fee-setup.md drizzle/migrations/0012_order_platform_fee.sql src/lib/platform-fee.ts src/lib/platform-fee.test.ts src/lib/order-fee.server.test.ts src/lib/orders-create.server.ts src/lib/orders.functions.ts src/lib/orders.ts src/lib/razorpay.server.ts src/lib/razorpay.test.ts src/lib/i18n.tsx src/components/admin-orders.tsx src/routes/index.tsx src/routes/terms.tsx src/routes/refund-policy.tsx
git commit -m "Add transparent 2.5 percent online-order platform fee"
git push origin main
```

Do not use git add . or force push. After Vercel Ready, close and reopen the web/app page so it loads the new fee calculation. No new APK or secrets are required for this web/server update when using the existing remote URL.

## Verify

- Check a subtotal of ₹100 displays ₹2.50 fee and ₹102.50 total; include binding and change paper/sides/copies to check live recalculation.
- Confirm Razorpay displays exactly the same final total. In a properly configured test environment, complete a test payment and inspect the admin breakdown.
- Confirm a subtotal-only/tampered expectedTotal is rejected, and a captured subtotal-only payment cannot verify against a fee-inclusive order.
- Confirm an old order retains its original amount and no new fee.
- Test cancel/failure still resets the form and produces no visible unpaid admin order.

Checks: production build, TypeScript and 74 Vitest checks including paise rounding, binding basis, server persistence, total tampering, historical snapshot preservation, capture verification, cancellation and retention checks. No real payment was executed here.

Reference for the distinction between merchant convenience fees and provider charges:
https://razorpay.com/terms/ (convenience fee clause and merchant fees section).
