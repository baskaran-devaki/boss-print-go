# Razorpay Standard Web Checkout

Implemented for the existing TanStack Start / React / Supabase app. The createCheckout and verifyCheckout POST server functions are the framework equivalents of create-order and verify-payment. Amounts come from the database quote, including binding sheet conversion, not from a trusted browser amount. The callback signature uses the database's order ID. Only a matching INR captured payment can mark an order verified. Manual receipts still require admin approval.

## Apply and configure

1. Apply the patch to the project root (baseline b0a717d). Do not force push or overwrite newer changes. Run `git apply --check boss-printgo-razorpay.patch`, then `git apply boss-printgo-razorpay.patch`.
2. Run `npm install`.
3. Run `drizzle/migrations/0009_razorpay_checkout.sql` in your own Supabase SQL editor. Existing customers, orders, binding and shop-status migrations must already be present.
4. Regenerate the test credentials disclosed in chat. Do not reuse them. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel's project environment variables. No VITE_ prefix; the create-checkout server function returns only the public key ID. For local development use an ignored .env with your existing Supabase variables and these keys. This change deliberately includes no real credentials.
5. Generate a separate random RAZORPAY_WEBHOOK_SECRET. Set it in Vercel and in Razorpay's webhook configuration. It is not your API Key Secret.
6. Configure the matching TEST-mode webhook URL: https://boss-print-go.vercel.app/api/razorpay-webhook and subscribe to payment.captured. Configure automatic capture in Razorpay. The webhook validates the raw-body signature, amount, currency and stored order association; failed processing returns 500 for retry.
7. Commit the changed files and push normally; wait for Vercel deployment. Configure webhook delivery after the endpoint is deployed. Use matching environment/mode for keys and webhook.

## Test before live payments

Run `npm test`, `npm run build`, then `npx tsc --noEmit`. Start locally with `npm run dev` (local webhook testing needs a reachable HTTPS endpoint). For a deployed test, sign in as a customer, upload a small document, set print/sides/binding and select Pay & Place Order. Complete Razorpay test checkout. Confirm the app displays Payment verified and admin sees the same amount/files/settings. Test cancellation/failure, retry the saved payment, reload during verification, close/reopen after payment, and webhook delivery retries. A failed/cancelled attempt stays unpaid. Continue saved payment reuses the same gateway order. A persistent browser token and server webhook preserve recovery; do not clear site storage during testing. Do not print pending_verification orders.

Signature-only success never approves an authorized but uncaptured payment. Use Check payment status while capture is processing. Browser focus and reopening the dashboard also check a saved payment. Existing Status/History list persisted orders.

## Android limitation

This is Standard **Web** Checkout. An existing Capacitor WebView may need native Razorpay/UPI intent handling to launch installed UPI apps and return correctly. No Android Java/Gradle changes are included. Verify web checkout in a normal browser first; test the installed APK separately before releasing it. Native Capacitor integration/APK rebuilding is a separate step.

## Files

- src/lib/razorpay.functions.ts — create, verify, status and resume POST server functions
- src/lib/razorpay.server.ts — credential isolation, gateway requests, signature/capture verification and webhook processing
- src/lib/razorpay-checkout.ts — script loading, checkout modal, cancellation/failure events
- src/lib/orders-create.server.ts — shared server quote and order persistence
- src/lib/orders.functions.ts and orders.ts — preserve manual submission and reuse base checkout validation
- src/routes/index.tsx — Pay & Place Order and saved-payment recovery
- src/routes/api/razorpay-webhook.ts and src/routeTree.gen.ts — webhook route
- drizzle/migrations/0009_razorpay_checkout.sql — provider identifiers and uniqueness indexes
- src/lib/razorpay.test.ts — signature tampering, amount/currency/order mismatch and uncaptured-payment checks
- .env.example, .gitignore, package.json, AGENTS.md — configuration and documented rules

No payment was executed and no live deployment/database update was made by this patch. Real gateway and database end-to-end tests require your private environment configuration.
