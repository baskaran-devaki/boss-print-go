# Compact customer header and reliable shop status

Baseline: main dd14bc1. Header grid uses a 48px logo, 24px printer tile and smaller vertically stacked Logout/Language controls. The main row plus ticker is nominally around 64 CSS pixels, similar to the 64px bottom navigation; Android's own status bar is separate. Dashboard/Status/History share this header. Login and its policy links are unchanged.

The previous public shop status query called a server function through the global auth-attacher, which waits for getSession even though status is public. It also had no request timeout, and default query network mode could stay pending when considered offline. We cannot identify the exact live network/auth cause from the screenshot alone. The fix removes these avoidable waits: public GET /api/shop-status returns only isOpen, closureReason and reopensAt from the existing service-role server client; admin mutation still independently requires authenticated admin access. DB read times out after 6 seconds; browser fetch after 8 seconds. The query runs even when the query manager considers the device offline, so it can return a useful failure instead of staying paused forever.

Failures produce a neutral Unavailable badge and an explicit Retry message. Never assume Open when the read fails, never use stale known-open data to unlock orders after an error, and retain the existing database protection against ordering while closed. Live reads poll every 5 seconds and refresh on reconnect/focus. No Supabase keys or private shop/admin data are sent to the browser.

## Apply

Save boss-printgo-compact-status.patch in Downloads. From the existing project root:

```powershell
git apply --check "$HOME\Downloads\boss-printgo-compact-status.patch"
# Only if the check succeeds:
git apply "$HOME\Downloads\boss-printgo-compact-status.patch"
npm run build
```

Then stage all update files, including the new API route:

```powershell
git add docs/compact-header-status.md src/components/customer-shell.tsx src/components/shop-status.tsx src/lib/shop-status.functions.ts src/lib/shop-status.server.ts src/lib/shop-status-client.ts src/lib/shop-status-client.test.ts src/lib/shop-status.server.test.ts src/routes/api/shop-status.ts src/routeTree.gen.ts
git commit -m "Compact customer header and fix stalled shop status"
git push origin main
```

Wait for Vercel Ready, then close/reopen the app. No new SQL, secrets or APK are required. Uses the existing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY that already serve payment/order requests.

Check https://boss-print-go.vercel.app/api/shop-status in a browser after deployment. Expected public response: {"isOpen":true,"closureReason":"","reopensAt":null} or the actual closed status/reason. If it returns 503, inspect Vercel function logs and the shop_status row/columns; do not manually force Open as a fallback. If it returns 404, the API route or latest deployment has not been published. Do not share logs containing secrets.

Verify admin Close Shop blocks the customer form and updates the badge; Open Shop restores it. Test a slow/offline request: loading must resolve to an explicit error/Retry and automatically recover when the connection returns. Verify logo, printer/status and Logout/Language stay in the requested left/centre/right positions at normal mobile width.

Checks passed locally: production build, TypeScript and 80 Vitest tests, including timeout/abort, service errors, malformed status, strict closed boolean and narrow public response. No live Supabase call or device screenshot was available in the local verification.
